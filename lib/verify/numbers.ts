/**
 * Guardrail 3: deterministic number check. No model involved.
 *
 * `numbersInText` finds every number a piece of text could mean: digits with
 * common separators ("2100", "2,100", "2.100", "2 100", "$2,100.50",
 * "1.850,50") and numbers spelled out in Spanish or English ("dos mil cien",
 * "mil ochocientos cincuenta", "two thousand one hundred", "twenty-one
 * hundred"). `verifyNumber` says whether a value is one of them.
 *
 * It's deliberately strict about grouping: "2,100" is 2100 (or 2.1), never
 * 100, so a value that dropped a thousand doesn't pass.
 */

const EPS = 0.005;

/* ---------- digits ---------- */

const DIGIT_TOKEN = /\d[\d.,   ]*\d|\d/g;
const SEP = /[.,   ]/;

function digitCandidates(token: string): number[] {
  const t = token.trim();
  const groups = t.split(SEP);
  const seps = t.match(/[.,   ]/g) ?? [];
  if (groups.length === 1) return [Number(t)];

  const out: number[] = [];
  // Thousands grouping: first group 1-3 digits, the rest exactly 3 ("2,100", "2.100", "2 100", "1,234,567").
  const validThousands = groups[0].length <= 3 && groups.slice(1).every((g) => g.length === 3);
  if (validThousands) out.push(Number(groups.join("")));

  // Last separator as a decimal point with 1-2 digits after it ("2100.50", "1.850,50", "2,5").
  const last = groups[groups.length - 1];
  const lastSep = seps[seps.length - 1];
  if ((lastSep === "." || lastSep === ",") && last.length <= 2) {
    const intGroups = groups.slice(0, -1);
    const intOk = intGroups.length === 1 || (intGroups[0].length <= 3 && intGroups.slice(1).every((g) => g.length === 3));
    if (intOk) out.push(Number(`${intGroups.join("")}.${last}`));
  }
  // A lone "2.100" / "2,100" could also be a decimal written the other way round.
  if (groups.length === 2 && (lastSep === "." || lastSep === ",") && last.length === 3) out.push(Number(`${groups[0]}.${last}`));

  // Not a valid single number (e.g. "3 2" from "3 2 hijos"): each piece on its own.
  if (out.length === 0) for (const g of groups) if (g) out.push(Number(g));
  return out;
}

/* ---------- words ---------- */

const strip = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const ES_SMALL: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};
const EN_SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALE: Record<string, number> = { mil: 1000, thousand: 1000, millon: 1e6, millones: 1e6, million: 1e6, millions: 1e6 };
const HUNDRED = new Set(["hundred"]);
/** Words that may sit inside a spoken number without ending it. */
const JOINERS = new Set(["y", "and"]);
/** "dos veces al mes", "two times a week": a count of times, never part of the amount before it. */
const TIMES = new Set(["vez", "veces", "time", "times"]);

function smallValue(w: string): number | undefined {
  return ES_SMALL[w] ?? EN_SMALL[w];
}

/** Parse runs of number words (and digits followed by "mil"/"thousand") into values. */
function wordNumbers(text: string): number[] {
  const words = strip(text)
    .replace(/(\d)[.,](?=\d{3}\b)/g, "$1") // "2,100 mil" edge: keep digits together
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean);
  const out: number[] = [];
  let total = 0;
  let current = 0;
  let inNumber = false;

  const flush = () => {
    if (inNumber) out.push(total + current);
    total = 0;
    current = 0;
    inNumber = false;
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = words[i + 1];
    const small = smallValue(w);
    if (small !== undefined) {
      // "mil dos veces al mes" is 1000 + "two times", not 1002.
      if (next && TIMES.has(next)) {
        flush();
        out.push(small);
        i++;
        continue;
      }
      // A new small number right after units ("cinco seis") starts a new number.
      if (inNumber && current % 10 !== 0 && small < 10 && current < 100) flush();
      current += small;
      inNumber = true;
    } else if (/^\d+$/.test(w) && next && (SCALE[next] || HUNDRED.has(next))) {
      current += Number(w); // "2 mil", "5 thousand"
      inNumber = true;
    } else if (HUNDRED.has(w) && inNumber) {
      current = (current || 1) * 100; // "five hundred", "twenty-one hundred" = 2100
    } else if (w === "a" && next && (HUNDRED.has(next) || SCALE[next])) {
      current = 1; // "a thousand", "a hundred"
      inNumber = true;
    } else if (SCALE[w]) {
      total += (current || 1) * SCALE[w]; // "mil" alone = 1000
      current = 0;
      inNumber = true;
    } else if (JOINERS.has(w) && inNumber && next && (smallValue(next) !== undefined || HUNDRED.has(next))) {
      // "treinta y cinco", "two thousand and fifty": keep going
    } else {
      flush();
    }
  }
  flush();
  return out;
}

/* ---------- public ---------- */

/**
 * Each place a number is mentioned, with what it could mean there
 * ("2.100" → [2100, 2.1]). One entry per mention, so repeats count separately.
 */
export function numberMentions(text: string): number[][] {
  const out: number[][] = [];
  for (const m of text.matchAll(DIGIT_TOKEN)) {
    const c = digitCandidates(m[0]).filter(Number.isFinite);
    // An invalid group ("3 2") is several separate mentions.
    if (c.length > 1 && !/^\d{1,3}([.,\u00A0\u202F ]\d{3})+([.,]\d{1,2})?$|^\d+[.,]\d{1,3}$/.test(m[0].trim())) c.forEach((n) => out.push([n]));
    else if (c.length) out.push(c);
  }
  for (const n of wordNumbers(text)) out.push([n]);
  return out;
}

/** Every number the text could mean (digits and spelled out, Spanish and English). */
export function numbersInText(text: string): number[] {
  return [...new Set(numberMentions(text).flat())];
}

/** True if `value` appears in `text`, as digits or spelled out. */
export function verifyNumber(value: number, text: string): boolean {
  return verifyNumbers([value], text);
}

/**
 * True if every value appears in `text`, each matched to a DIFFERENT mention.
 * "tres adultos y dos niños" verifies [3, 2] but not [3, 3].
 */
export function verifyNumbers(values: number[], text: string): boolean {
  const mentions = numberMentions(text);
  const used = new Set<number>();
  return values.every((v) => {
    if (!Number.isFinite(v)) return false;
    const i = mentions.findIndex((cands, idx) => !used.has(idx) && cands.some((n) => Math.abs(n - v) < EPS));
    if (i < 0) return false;
    used.add(i);
    return true;
  });
}
