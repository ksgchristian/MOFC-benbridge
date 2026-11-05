import type { LangCode } from "@/lib/languages";

/**
 * Finds the parts of a transcript or value where speech errors hurt most:
 * numbers (digits or spelled out), how often (weekly vs monthly), and
 * gross vs net. Used to <mark> them so people double-check those words.
 */
export type RiskKind = "number" | "frequency" | "basis";

export interface RiskSpan {
  start: number;
  end: number;
  kind: RiskKind;
}

// Unicode-aware word boundaries (\b is ASCII-only and misses "año", "después").
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";

const DIGITS = String.raw`\$?\d[\d,]*(?:\.\d+)?%?`;

const EN_NUM_WORD =
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|half|dozen";
const ES_NUM_WORD =
  "cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|dieciseis|diecisiete|dieciocho|diecinueve|veinte|veinti\\p{L}+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil|millón|millon|millones|medio|media";

/** One number word, optionally chained: "two thousand one hundred", "dos mil cien", "treinta y cinco". */
function chained(words: string, joiner: string) {
  return `(?:${words})(?:(?:${joiner})(?:${words}))*`;
}

const PATTERNS: Record<LangCode, Record<RiskKind, string[]>> = {
  en: {
    number: [DIGITS, chained(EN_NUM_WORD, String.raw`[\s-]+(?:and\s+)?`)],
    frequency: [
      String.raw`every\s+(?:two|2|other)\s+weeks`,
      String.raw`twice\s+a\s+month`,
      String.raw`(?:per|a|each|every)\s+(?:week|month|year|day|hour)`,
      "bi-?weekly|semi-?monthly|weekly|monthly|yearly|annually|annual|daily|hourly",
    ],
    basis: [String.raw`(?:before|after)\s+tax(?:es)?`, String.raw`take[\s-]home`, "gross|net"],
  },
  es: {
    number: [DIGITS, chained(ES_NUM_WORD, String.raw`\s+y\s+|\s+`)],
    frequency: [
      String.raw`cada\s+(?:dos|2)\s+semanas`,
      String.raw`cada\s+quince\s+días`,
      String.raw`dos\s+veces\s+al\s+mes`,
      String.raw`(?:a\s+la|por)\s+semana`,
      String.raw`(?:al|por)\s+(?:mes|año|día)`,
      String.raw`por\s+hora|la\s+hora`,
      "semanal(?:es|mente)?|quincenal(?:es|mente)?|mensual(?:es|mente)?|anual(?:es|mente)?|diari[oa]s?",
    ],
    basis: [String.raw`(?:antes|después|despues)\s+de\s+(?:los\s+)?impuestos`, "brut[oa]s?|net[oa]s?"],
  },
};

const RE_CACHE = new Map<string, RegExp>();
function regexFor(lang: LangCode, kind: RiskKind): RegExp {
  const key = `${lang}:${kind}`;
  let re = RE_CACHE.get(key);
  if (!re) {
    re = new RegExp(`${B}(?:${PATTERNS[lang][kind].join("|")})${E}`, "giu");
    RE_CACHE.set(key, re);
  }
  return re;
}

/** Non-overlapping risky spans, sorted by position. Longer matches win on overlap. */
export function riskySpans(text: string, lang: LangCode): RiskSpan[] {
  const found: RiskSpan[] = [];
  for (const kind of ["frequency", "basis", "number"] as RiskKind[]) {
    for (const m of text.matchAll(regexFor(lang, kind))) {
      const start = m.index ?? 0;
      found.push({ start, end: start + m[0].length, kind });
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const out: RiskSpan[] = [];
  for (const s of found) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      if (s.end - s.start > last.end - last.start) out[out.length - 1] = s;
      continue;
    }
    out.push(s);
  }
  return out;
}

/** Split text into plain and risky segments for rendering. */
export function segment(text: string, lang: LangCode): { text: string; kind?: RiskKind }[] {
  const segs: { text: string; kind?: RiskKind }[] = [];
  let i = 0;
  for (const s of riskySpans(text, lang)) {
    if (s.start > i) segs.push({ text: text.slice(i, s.start) });
    segs.push({ text: text.slice(s.start, s.end), kind: s.kind });
    i = s.end;
  }
  if (i < text.length) segs.push({ text: text.slice(i) });
  return segs;
}
