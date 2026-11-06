import { encodeMoney, type Period } from "@/lib/forms/money";
import { allFields, type FormField, type FormSchema } from "@/lib/forms/schema";
import type { FieldDraft, ModelDraft, UnclearReason } from "./schema";

/**
 * Turns Claude's raw drafts into form-ready values. Whether a draft is
 * UNCLEAR is decided here, in code, from what was (not) said, never from the
 * model's own confidence. No unit conversion: money is kept as stated.
 */

export const ASK: Record<UnclearReason, string> = {
  period: "Ask: how often is that paid: every week, every two weeks, twice a month, or once a month?",
  quincena: "Ask: “quincenal” can mean twice a month (24 paychecks a year) or every two weeks (26 a year). Which one?",
  income_type: "Ask: is that before taxes (gross) or after taxes (net)?",
  approximate: "Ask for the exact amount (they said “about”). A pay stub helps.",
  no_amount: "Ask: does anyone in the household get any income right now? How much?",
  household: "Ask: how many people live with you and buy and prepare food with you?",
  household_math: "Ask them to count again: the people they listed don't add up to the total they said.",
  number: "Ask for the exact number.",
  date: "Ask for the full date (day, month and year).",
};

/** Words that mean the amount is approximate. Checked in code, not by the model. */
const APPROX = /(?<![\p{L}])(como|más o menos|mas o menos|aproximadamente|alrededor de|casi|unos|unas|about|around|roughly|approximately|almost|or so)(?![\p{L}])/iu;
/** "Quincenal" is 24 or 26 pay periods depending on the country: always ask. */
const QUINCENA = /quincen|cada\s+quince\s+d[ií]as/iu;

function unclear(fieldId: string, value: string, reason: UnclearReason | UnclearReason[], math?: string): FieldDraft {
  const reasons = Array.isArray(reason) ? reason : [reason];
  return { fieldId, value, unclear: true, ask: reasons.map((r) => ASK[r]).join(" "), reason: reasons[0], ...(math ? { math } : {}) };
}

type MoneyField = Extract<FormField, { type: "money" }>;

function normalizeMoney(field: MoneyField, d: ModelDraft, form: FormSchema, evidence: string): FieldDraft | null {
  // A clearly gross/net amount aimed at the wrong income field goes to the matching one.
  if (field.basis && (d.income_type === "gross" || d.income_type === "net") && d.income_type !== field.basis) {
    const other = allFields(form).find((f): f is MoneyField => f.type === "money" && f.basis === d.income_type);
    if (!other) return unclear(field.id, "", "income_type");
    field = other;
  }

  // "No trabajo ahora": no amount was said. Never turn that into 0.
  if (d.income_amount == null || !Number.isFinite(d.income_amount)) return unclear(field.id, "", "no_amount");
  if (d.income_amount < 0) return null;

  const period: Period | null = d.income_period && d.income_period !== "UNCLEAR" ? d.income_period : null;
  const value = encodeMoney(d.income_amount, period);

  // A missing qualifier is UNCLEAR, never a default. List every question the navigator needs to ask.
  const reasons: UnclearReason[] = [];
  const quincena = QUINCENA.test(evidence);
  if (quincena) reasons.push("quincena");
  else if (!period) reasons.push("period");
  if (field.basis && (d.income_type == null || d.income_type === "UNCLEAR")) reasons.push("income_type");
  if (APPROX.test(evidence)) reasons.push("approximate");
  if (reasons.length) return unclear(field.id, quincena ? encodeMoney(d.income_amount, null) : value, reasons);
  return { fieldId: field.id, value, unclear: false, ask: "" };
}

function normalizeHousehold(field: FormField, d: ModelDraft): FieldDraft {
  const parts = d.household_parts.filter((p) => Number.isInteger(p.count) && p.count >= 0);
  if (parts.length > 0) {
    // The arithmetic is done here and shown to people.
    const sum = parts.reduce((n, p) => n + p.count, 0);
    const math = `${parts.map((p) => `${p.count} ${p.label}`).join(" + ")} = ${sum}`;
    if (typeof d.household_size === "number" && d.household_size !== sum) return unclear(field.id, "", "household_math", math);
    return { fieldId: field.id, value: String(sum), unclear: false, ask: "", math };
  }
  if (typeof d.household_size === "number" && d.household_size > 0) {
    return { fieldId: field.id, value: String(d.household_size), unclear: false, ask: "" };
  }
  return unclear(field.id, "", "household");
}

function normalizeOne(d: ModelDraft, form: FormSchema, evidence: string): FieldDraft | null {
  const field = allFields(form).find((f) => f.id === d.field_id);
  if (!field) return null; // Claude named a field that doesn't exist: drop it.

  const raw = (d.value ?? "").trim();
  switch (field.type) {
    case "money":
      return normalizeMoney(field, d, form, evidence);
    case "number":
      if (field.allowParts) return normalizeHousehold(field, d);
      return /^\d+$/.test(raw) ? { fieldId: field.id, value: raw, unclear: false, ask: "" } : unclear(field.id, "", "number");
    case "yesno":
      return raw === "yes" || raw === "no" ? { fieldId: field.id, value: raw, unclear: false, ask: "" } : null;
    case "select":
      return field.options.some((o) => o.value === raw) ? { fieldId: field.id, value: raw, unclear: false, ask: "" } : null;
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? { fieldId: field.id, value: raw, unclear: false, ask: "" } : unclear(field.id, "", "date");
    default:
      return raw ? { fieldId: field.id, value: raw, unclear: false, ask: "" } : null;
  }
}

/**
 * Normalize all drafts for one conversation line. `line` is the original text
 * of that line; code-side checks (approximate amounts, "quincenal") read it.
 * If two drafts land on the same field, the last one wins.
 */
export function normalizeDrafts(drafts: ModelDraft[], form: FormSchema, line: string): FieldDraft[] {
  const byField = new Map<string, FieldDraft>();
  for (const d of drafts) {
    const n = normalizeOne(d, form, line);
    if (n) byField.set(n.fieldId, n);
  }
  return [...byField.values()];
}
