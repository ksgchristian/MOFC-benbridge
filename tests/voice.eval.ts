/**
 * Live check of the voice pipeline: spoken-style transcripts (numbers written
 * out, filler words, no punctuation) go through the SAME translate → draft
 * steps the app uses. Costs a few cents. Not part of `npm test`.
 * Run: npm run eval:voice   (needs ANTHROPIC_API_KEY in .env.local)
 */
import { draftFields } from "@/lib/draft/claude";
import type { FieldDraft } from "@/lib/draft/schema";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";
import type { LangCode } from "@/lib/languages";
import type { Speaker } from "@/lib/session/types";
import { translateText } from "@/lib/translate/claude";

type Check = (drafts: Map<string, FieldDraft>) => string | null; // null = pass, else reason

const value = (fieldId: string, expected: string): Check => (d) => {
  const got = d.get(fieldId);
  if (!got) return `${fieldId} not drafted (expected ${expected})`;
  if (got.unclear) return `${fieldId} marked unclear (${got.ask}), expected ${expected}`;
  return got.value === expected ? null : `${fieldId} = ${got.value}, expected ${expected}`;
};
const approx = (fieldId: string, expected: number, tol = 1): Check => (d) => {
  const got = d.get(fieldId);
  if (!got) return `${fieldId} not drafted (expected ≈${expected})`;
  if (got.unclear) return `${fieldId} marked unclear (${got.ask}), expected ≈${expected}`;
  return Math.abs(Number(got.value) - expected) <= tol ? null : `${fieldId} = ${got.value}, expected ≈${expected}`;
};
const unclear = (fieldId: string): Check => (d) => {
  const got = d.get(fieldId);
  if (!got) return `${fieldId} not drafted (expected an unclear draft)`;
  return got.unclear ? null : `${fieldId} = ${got.value} drafted as clear, expected unclear`;
};
const notClear = (fieldId: string): Check => (d) => {
  const got = d.get(fieldId);
  return !got || got.unclear ? null : `${fieldId} = ${got.value} should not be drafted as clear`;
};

interface Case {
  name: string;
  speaker: Speaker;
  lang: LangCode;
  transcript: string;
  context?: { speaker: Speaker; text: string }[];
  checks: Check[];
}

const CASES: Case[] = [
  {
    name: "household size, spelled out",
    speaker: "neighbor", lang: "es",
    transcript: "somos tres en la casa yo y mis dos hijos",
    checks: [value("householdSize", "3")],
  },
  {
    name: "monthly gross, numbers written out",
    speaker: "neighbor", lang: "es",
    transcript: "gano dos mil cien al mes antes de impuestos",
    checks: [value("grossMonthlyIncome", "2100")],
  },
  {
    name: "weekly gross converted to monthly in code",
    speaker: "neighbor", lang: "es",
    transcript: "me pagan quinientos a la semana antes de impuestos",
    checks: [approx("grossMonthlyIncome", 2166.67)],
  },
  {
    name: "every two weeks gross",
    speaker: "neighbor", lang: "es",
    transcript: "eh me pagan novecientos setenta cada dos semanas antes de los impuestos",
    checks: [approx("grossMonthlyIncome", 2101.67)],
  },
  {
    name: "gross/net not said → unclear",
    speaker: "neighbor", lang: "es",
    transcript: "gano como dos mil al mes",
    checks: [unclear("grossMonthlyIncome")],
  },
  {
    name: "after taxes goes to net, not gross",
    speaker: "neighbor", lang: "es",
    transcript: "mil ochocientos cincuenta al mes después de impuestos",
    checks: [value("netMonthlyIncome", "1850"), notClear("grossMonthlyIncome")],
  },
  {
    name: "short answer uses context",
    speaker: "neighbor", lang: "es",
    transcript: "cuatro",
    context: [{ speaker: "navigator", text: "How many people live in your household, including you?" }],
    checks: [value("householdSize", "4")],
  },
  {
    name: "navigator relays in English with filler",
    speaker: "navigator", lang: "en",
    transcript: "um so she says four people live there",
    checks: [value("householdSize", "4")],
  },
  {
    name: "a question drafts nothing",
    speaker: "navigator", lang: "en",
    transcript: "what is your gross monthly income before taxes",
    checks: [notClear("grossMonthlyIncome")],
  },
];

async function main() {
  let failed = 0;
  for (const c of CASES) {
    const started = Date.now();
    try {
      const to: LangCode = c.lang === "en" ? "es" : "en";
      const t = await translateText(c.transcript, c.lang, to, "conversation");
      const drafts = await draftFields(form, { speaker: c.speaker, lang: c.lang, text: c.transcript, context: c.context ?? [] });
      const byField = new Map(drafts.map((d) => [d.fieldId, d]));
      const problems = [t.translation.trim() ? null : "empty translation", ...c.checks.map((check) => check(byField))].filter(Boolean);
      if (problems.length) failed++;
      console.log(`${problems.length ? "FAIL" : "PASS"} (${Date.now() - started}ms) ${c.name}: "${c.transcript}"`);
      console.log(`     → ${t.translation}`);
      console.log(`     drafts: ${drafts.map((d) => `${d.fieldId}=${d.value}${d.unclear ? " [unclear]" : ""}`).join(", ") || "(none)"}`);
      for (const p of problems) console.log(`     ✗ ${p}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${c.name}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\nvoice: ${CASES.length - failed}/${CASES.length} passed`);
  process.exit(failed ? 1 : 0);
}

void main();
