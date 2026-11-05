import { allFields, type FormField, type FormSchema } from "@/lib/forms/schema";
import type { FieldDraft, ModelDraft, Period } from "./schema";

/**
 * Turns Claude's raw drafts into form-ready values. All arithmetic happens
 * here, in code, never in the model: amounts are converted to the field's
 * period, and anything with an unclear period or gross/net basis is marked
 * unclear with a question for the navigator.
 */

export const MONTHLY_FACTOR: Record<Exclude<Period, "unclear" | "not_applicable">, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  yearly: 1 / 12,
};

export const ASK = {
  amount: "Ask for the exact amount.",
  period: "Ask: is that per week, every two weeks, twice a month, or per month?",
  basis: "Ask: is that before taxes (gross) or after taxes (net)?",
  number: "Ask for the exact number.",
};

function formatAmount(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function unclear(fieldId: string, value: string, ask: string): FieldDraft {
  return { fieldId, value, unclear: true, ask };
}

function normalizeMoney(field: Extract<FormField, { type: "money" }>, d: ModelDraft, form: FormSchema): FieldDraft | null {
  // Re-route a clearly gross/net amount to the matching field (e.g. "after taxes" said while asking gross).
  if (field.basis && (d.basis === "gross" || d.basis === "net") && d.basis !== field.basis) {
    const other = allFields(form).find(
      (f): f is Extract<FormField, { type: "money" }> => f.type === "money" && f.basis === d.basis && f.period === field.period,
    );
    if (!other) return unclear(field.id, "", ASK.basis);
    field = other;
  }

  if (d.amount == null || !Number.isFinite(d.amount) || d.amount < 0) {
    return unclear(field.id, "", d.ask_navigator || ASK.amount);
  }
  const asStated = formatAmount(d.amount);

  if (field.basis && (d.basis === "unclear" || d.basis === "not_applicable")) {
    return unclear(field.id, asStated, ASK.basis);
  }

  let value = asStated;
  if (field.period === "monthly") {
    if (d.period === "unclear" || d.period === "not_applicable") return unclear(field.id, asStated, ASK.period);
    value = formatAmount(d.amount * MONTHLY_FACTOR[d.period]);
  }

  if (d.unclear) return unclear(field.id, value, d.ask_navigator || ASK.amount);
  return { fieldId: field.id, value, unclear: false, ask: "" };
}

function normalizeOne(d: ModelDraft, form: FormSchema): FieldDraft | null {
  const field = allFields(form).find((f) => f.id === d.field_id);
  if (!field) return null; // Claude named a field that doesn't exist: drop it.

  const raw = d.value.trim();
  switch (field.type) {
    case "money":
      return normalizeMoney(field, d, form);
    case "number": {
      if (!/^\d+$/.test(raw)) return unclear(field.id, raw, d.ask_navigator || ASK.number);
      break;
    }
    case "yesno":
      if (raw !== "yes" && raw !== "no") return null;
      break;
    case "select":
      if (!field.options.some((o) => o.value === raw)) return null;
      break;
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return unclear(field.id, raw, d.ask_navigator || "Ask for the full date.");
      break;
    default:
      if (!raw) return null;
  }
  return { fieldId: field.id, value: raw, unclear: d.unclear, ask: d.unclear ? d.ask_navigator : "" };
}

/** Normalize all drafts. If two drafts land on the same field, the last one wins. */
export function normalizeDrafts(drafts: ModelDraft[], form: FormSchema): FieldDraft[] {
  const byField = new Map<string, FieldDraft>();
  for (const d of drafts) {
    const n = normalizeOne(d, form);
    if (n) byField.set(n.fieldId, n);
  }
  return [...byField.values()];
}
