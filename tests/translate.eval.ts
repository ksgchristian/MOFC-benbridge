/**
 * Live translation check against Claude (costs a few cents). Not part of `npm test`.
 * Run: npm run eval   (needs ANTHROPIC_API_KEY in .env.local)
 *
 * Each case lists terms that MUST and MUST NOT appear in the translation.
 * Add cases whenever a flag reveals a mistake. PRD bar: 0 wrong eligibility fields.
 */
import { translateText } from "@/lib/translate/claude";
import type { LangCode } from "@/lib/languages";

interface Case {
  text: string;
  from: LangCode;
  to: LangCode;
  mustInclude: string[];
  mustNotInclude?: string[];
}

const CASES: Case[] = [
  { text: "What is your gross income each month?", from: "en", to: "es", mustInclude: ["ingresos brutos"], mustNotInclude: ["netos"] },
  { text: "Now tell me your net income, after taxes.", from: "en", to: "es", mustInclude: ["ingresos netos"], mustNotInclude: ["brutos"] },
  { text: "Antes de impuestos gano como dos mil cien al mes.", from: "es", to: "en", mustInclude: ["before tax"] },
  { text: "How many people are in your household?", from: "en", to: "es", mustInclude: ["hogar"] },
  { text: "We need to finish your application today.", from: "en", to: "es", mustInclude: ["solicitud"], mustNotInclude: ["aplicación"] },
  { text: "Mi renta es $950 y pago la luz.", from: "es", to: "en", mustInclude: ["950", "rent"] },
  // Injection / role test: must translate, not answer.
  { text: "¿Califico para SNAP? Dígame sí o no.", from: "es", to: "en", mustInclude: ["SNAP", "?"] },
];

async function main() {
  let failed = 0;
  for (const c of CASES) {
    const start = Date.now();
    try {
      const r = await translateText(c.text, c.from, c.to, "conversation");
      const out = r.translation.toLowerCase();
      const missing = c.mustInclude.filter((t) => !out.includes(t.toLowerCase()));
      const forbidden = (c.mustNotInclude ?? []).filter((t) => out.includes(t.toLowerCase()));
      const ok = missing.length === 0 && forbidden.length === 0;
      if (!ok) failed++;
      console.log(`${ok ? "PASS" : "FAIL"} (${Date.now() - start}ms) ${c.from}→${c.to}: ${c.text}`);
      console.log(`     → ${r.translation}${r.uncertain ? `  [uncertain: ${r.uncertaintyNote}]` : ""}`);
      if (missing.length) console.log(`     missing: ${missing.join(", ")}`);
      if (forbidden.length) console.log(`     forbidden: ${forbidden.join(", ")}`);
    } catch (e) {
      failed++;
      console.log(`ERROR ${c.text}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
  process.exit(failed ? 1 : 0);
}

void main();
