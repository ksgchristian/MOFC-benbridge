import raw from "@/lib/glossary/readback.json";
import { displayValue } from "@/lib/forms/display";
import { formatMoney, parseMoney, PERIOD_LABEL } from "@/lib/forms/money";
import type { FormField, LocalizedText } from "@/lib/forms/schema";
import type { LangCode } from "@/lib/languages";

/**
 * Guardrail 4: turn a pending answer into the question the neighbor answers
 * Sí/No to ("¿Gana $2,100 al mes, antes de impuestos?"). Returned as
 * segments so the numbers and units can be shown large and high-contrast.
 */
export interface ReadbackText {
  es: string;
  en: string;
  reviewed: boolean;
}
type Entry = ReadbackText | { yes: ReadbackText; no: ReadbackText };
const TEMPLATES = raw as unknown as Record<string, Entry> & { _default: ReadbackText };

export interface Segment {
  text: string;
  /** True for the answer itself (numbers, units, the value): shown large. */
  emphasis: boolean;
}

export function readbackTemplate(fieldId: string, value: string): ReadbackText {
  const e = TEMPLATES[fieldId];
  if (!e) return TEMPLATES._default;
  if ("yes" in e) return value === "no" ? e.no : e.yes;
  return e;
}

/** Build the read-back question for `value` of `field`, in `lang`. */
export function buildReadback(
  field: FormField,
  value: string,
  lang: LangCode,
  t: (key: string, text: LocalizedText | undefined) => string,
): Segment[] {
  const template = readbackTemplate(field.id, value)[lang === "es" ? "es" : "en"];
  const money = field.type === "money" ? parseMoney(value) : null;
  const fill: Record<string, string> = {
    value: displayValue(field, value, lang, t),
    amount: money ? formatMoney({ amount: money.amount, period: null }, lang) : "",
    period: money?.period ? PERIOD_LABEL[money.period][lang === "es" ? "es" : "en"] : "",
  };
  const segments: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(/\{(value|amount|period)\}/g)) {
    const i = m.index ?? 0;
    if (i > last) segments.push({ text: template.slice(last, i), emphasis: false });
    segments.push({ text: fill[m[1]], emphasis: true });
    last = i + m[0].length;
  }
  if (last < template.length) segments.push({ text: template.slice(last), emphasis: false });
  return segments.filter((s) => s.text !== "");
}

export const readbackToString = (segments: Segment[]) => segments.map((s) => s.text).join("");

/** All read-back entries, for checks. */
export function allReadbackTexts(): ReadbackText[] {
  const out: ReadbackText[] = [];
  for (const [k, e] of Object.entries(raw)) {
    if (k === "_note") continue;
    const entry = e as Entry;
    if ("yes" in entry) out.push(entry.yes, entry.no);
    else out.push(entry);
  }
  return out;
}
