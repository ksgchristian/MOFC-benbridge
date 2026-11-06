/**
 * Live check of the voice pipeline: spoken-style transcripts (numbers written
 * out, filler words, no punctuation) go through the SAME translate → draft
 * steps the app uses. Costs a few cents. Not part of `npm test`.
 * Run: npm run eval:voice   (needs ANTHROPIC_API_KEY in .env.local)
 *
 * Fails LOUDLY (exit 1) if the draft output shape changes or a case names a
 * field that no longer exists. A stale eval that goes green is worse than none.
 */
import { draftFields } from "@/lib/draft/claude";
import { FieldDraftShape, type FieldDraft, type UnclearReason } from "@/lib/draft/schema";
import { allFields } from "@/lib/forms/schema";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";
import type { LangCode } from "@/lib/languages";
import type { Speaker } from "@/lib/session/types";
import { translateText } from "@/lib/translate/claude";

const FIELD_IDS = new Set(allFields(form).map((f) => f.id));

interface Check {
  field: string;
  run: (drafts: Map<string, FieldDraft>) => string | null; // null = pass, else reason
}

/** A clear value, with the quote it came from. */
const value = (field: string, expected: string, math?: string): Check => ({
  field,
  run: (d) => {
    const got = d.get(field);
    if (!got) return `${field} not drafted (expected ${expected})`;
    if (got.unclear) return `${field} marked unclear (${got.reason}: ${got.ask}), expected ${expected}`;
    if (got.value !== expected) return `${field} = ${got.value}, expected ${expected}`;
    if (!got.quote) return `${field} has no quote (provenance missing)`;
    if (math && got.math !== math) return `${field} math = ${got.math}, expected ${math}`;
    return null;
  },
});
/** Drafted, but UNCLEAR (optionally for a specific reason). Must not show a clear value. */
const unclear = (field: string, reason?: UnclearReason): Check => ({
  field,
  run: (d) => {
    const got = d.get(field);
    if (!got) return `${field} not drafted (expected an unclear draft)`;
    if (!got.unclear) return `${field} = ${got.value} drafted as clear, expected unclear`;
    if (reason && got.reason !== reason) return `${field} unclear for ${got.reason}, expected ${reason}`;
    return null;
  },
});
/** Not drafted, or only as unclear. Never a clear value. */
const notClear = (field: string): Check => ({
  field,
  run: (d) => {
    const got = d.get(field);
    return !got || got.unclear ? null : `${field} = ${got.value} should not be drafted as clear`;
  },
});
/** Never drafted with this exact value (e.g. "0" for "no trabajo ahora"). */
const never = (field: string, bad: string): Check => ({
  field,
  run: (d) => (d.get(field)?.value.startsWith(bad) ? `${field} = ${d.get(field)!.value} (must never be ${bad})` : null),
});

interface Case {
  name: string;
  speaker: Speaker;
  lang: LangCode;
  transcript: string;
  context?: { speaker: Speaker; text: string }[];
  checks: Check[];
}

const CASES: Case[] = [
  { name: "household size, spelled out", speaker: "neighbor", lang: "es", transcript: "somos tres en la casa yo y mis dos hijos", checks: [value("householdSize", "3")] },
  { name: "household in parts, math shown", speaker: "neighbor", lang: "es", transcript: "somos 3 adultos y 2 niños", checks: [value("householdSize", "5", "3 adults + 2 children = 5")] },
  { name: "monthly gross, numbers written out", speaker: "neighbor", lang: "es", transcript: "gano dos mil cien al mes antes de impuestos", checks: [value("grossIncome", "2100/monthly")] },
  { name: "weekly gross kept as stated (no conversion)", speaker: "neighbor", lang: "es", transcript: "me pagan quinientos a la semana antes de impuestos", checks: [value("grossIncome", "500/weekly")] },
  { name: "every two weeks gross", speaker: "neighbor", lang: "es", transcript: "eh me pagan novecientos setenta cada dos semanas antes de los impuestos", checks: [value("grossIncome", "970/biweekly")] },
  { name: "gross/net not said → unclear", speaker: "neighbor", lang: "es", transcript: "gano dos mil al mes", checks: [unclear("grossIncome", "income_type")] },
  { name: "'about' → unclear", speaker: "neighbor", lang: "es", transcript: "gano como dos mil al mes antes de impuestos", checks: [unclear("grossIncome", "approximate")] },
  { name: "quincena → unclear (24 vs 26)", speaker: "neighbor", lang: "es", transcript: "me pagan mil la quincena antes de impuestos", checks: [unclear("grossIncome", "quincena")] },
  { name: "no work → never 0", speaker: "neighbor", lang: "es", transcript: "no trabajo ahora", checks: [notClear("grossIncome"), never("grossIncome", "0")] },
  { name: "take-home dialect ('me quedan') goes to net", speaker: "neighbor", lang: "es", transcript: "me quedan mil ochocientos cincuenta al mes", checks: [value("netIncome", "1850/monthly"), notClear("grossIncome")] },
  { name: "after taxes goes to net, not gross", speaker: "neighbor", lang: "es", transcript: "mil ochocientos cincuenta al mes después de impuestos", checks: [value("netIncome", "1850/monthly"), notClear("grossIncome")] },
  {
    name: "short answer uses context",
    speaker: "neighbor",
    lang: "es",
    transcript: "cuatro",
    context: [{ speaker: "navigator", text: "How many people live in your household, including you?" }],
    checks: [value("householdSize", "4")],
  },
  { name: "navigator relays in English with filler", speaker: "navigator", lang: "en", transcript: "um so she says four people live there", checks: [value("householdSize", "4")] },
  { name: "a question drafts nothing", speaker: "navigator", lang: "en", transcript: "what is your gross monthly income before taxes", checks: [notClear("grossIncome")] },
];

function staleCases(): string[] {
  return CASES.flatMap((c) => c.checks.filter((k) => !FIELD_IDS.has(k.field)).map((k) => `"${c.name}" checks unknown field ${k.field}`));
}

async function main() {
  const stale = staleCases();
  if (stale.length) {
    console.error(`\nSTALE EVAL: cases refer to fields that no longer exist in the form:\n  ${stale.join("\n  ")}\n`);
    process.exit(1);
  }

  let failed = 0;
  for (const c of CASES) {
    const started = Date.now();
    try {
      const to: LangCode = c.lang === "en" ? "es" : "en";
      const t = await translateText(c.transcript, c.lang, to, "conversation");
      const drafts = await draftFields(form, { speaker: c.speaker, lang: c.lang, text: c.transcript, context: c.context ?? [] });

      // Shape check first: if the output shape changed, say so instead of passing or skipping.
      const shapeErrors = drafts.flatMap((d, i) => {
        const r = FieldDraftShape.strict().safeParse(d);
        return r.success ? [] : [`draft[${i}]: ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`];
      });
      if (shapeErrors.length) {
        failed++;
        console.log(`FAIL SHAPE CHANGED ${c.name}:\n     ${shapeErrors.join("\n     ")}`);
        continue;
      }

      const byField = new Map(drafts.map((d) => [d.fieldId, d]));
      const problems = [t.translation.trim() ? null : "empty translation", ...c.checks.map((k) => k.run(byField))].filter(Boolean);
      if (problems.length) failed++;
      console.log(`${problems.length ? "FAIL" : "PASS"} (${Date.now() - started}ms) ${c.name}: "${c.transcript}"`);
      console.log(`     → ${t.translation}${t.uncertain ? "  [model self-reported uncertain; not shown in UI]" : ""}`);
      console.log(
        `     drafts: ${drafts.map((d) => `${d.fieldId}=${d.value || "∅"}${d.unclear ? ` [unclear:${d.reason}]` : ""}${d.quote ? ` ← "${d.quote}"` : ""}`).join(", ") || "(none)"}`,
      );
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
