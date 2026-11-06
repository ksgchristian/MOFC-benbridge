import raw from "@/lib/glossary/qualifiers.json";

/**
 * Qualifier check (guardrail 1b). No model involved. A qualifier that makes a
 * number mean something (gross/net, how often) must be verifiable against
 * the transcript exactly like the number is:
 *
 *   supported    a marker for the claimed value is in the quote, and no marker for another value
 *   contradicted a marker for a different value is in the quote (model says gross, quote says "después de impuestos")
 *   unsupported  no marker at all: the label has nothing in the text behind it
 *
 * Only "supported" is accepted. The marker words live in
 * lib/glossary/qualifiers.json (draft, for review by a bilingual navigator).
 */
export type QualifierKind = "income_type" | "income_period";
export type QualifierCheck = "supported" | "contradicted" | "unsupported";

interface MarkerEntry {
  reviewed: boolean;
  es: string[];
  en: string[];
}
const LISTS = raw as unknown as Record<QualifierKind, Record<string, MarkerEntry>>;

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Marker {
  value: string;
  phrase: string;
  re: RegExp;
}
const MARKERS: Record<QualifierKind, Marker[]> = { income_type: [], income_period: [] };
for (const kind of Object.keys(MARKERS) as QualifierKind[]) {
  for (const [value, entry] of Object.entries(LISTS[kind])) {
    for (const phrase of [...entry.es, ...entry.en]) {
      const p = fold(phrase).trim();
      // Whole words only ("net" never matches "network"); hyphen or space between words.
      const body = p.split(/[ -]/).map(escape).join("[ -]");
      MARKERS[kind].push({ value, phrase: p, re: new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "gu") });
    }
  }
  // Longest first, so "dos veces al mes" claims its words before "al mes" can.
  MARKERS[kind].sort((a, b) => b.phrase.length - a.phrase.length);
}

/** Which values of this qualifier the quote has markers for (longer phrases win overlaps). */
export function qualifierMarkers(kind: QualifierKind, quote: string): Set<string> {
  const text = fold(quote);
  const taken: [number, number][] = [];
  const found = new Set<string>();
  for (const m of MARKERS[kind]) {
    for (const hit of text.matchAll(m.re)) {
      const start = hit.index ?? 0;
      const end = start + hit[0].length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      found.add(m.value);
    }
  }
  return found;
}

/** Is `claimed` backed by the words in `quote`? */
export function verifyQualifier(kind: QualifierKind, claimed: string, quote: string): QualifierCheck {
  const found = qualifierMarkers(kind, quote);
  if ([...found].some((v) => v !== claimed)) return "contradicted";
  return found.has(claimed) ? "supported" : "unsupported";
}

/** All marker entries, for checks. */
export function allQualifierEntries(): { kind: QualifierKind; value: string; entry: MarkerEntry }[] {
  return (["income_type", "income_period"] as QualifierKind[]).flatMap((kind) => Object.entries(LISTS[kind]).map(([value, entry]) => ({ kind, value, entry })));
}
