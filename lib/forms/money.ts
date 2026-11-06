import type { LangCode } from "@/lib/languages";

/**
 * Money is stored exactly as stated: an amount and how often it's paid
 * ("500/weekly"). We do NOT convert to monthly: the conversion factor an
 * agency uses (exact 52/12 vs SNAP's 4.3 / 2.15) isn't confirmed for our
 * form, and storing what was said is more faithful. Open question for MOFC.
 */
export const PERIODS = ["weekly", "biweekly", "semimonthly", "monthly", "annual"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, { en: string; es: string }> = {
  weekly: { en: "per week", es: "a la semana" },
  biweekly: { en: "every two weeks", es: "cada dos semanas" },
  semimonthly: { en: "twice a month", es: "dos veces al mes" },
  monthly: { en: "per month", es: "al mes" },
  annual: { en: "per year", es: "al año" },
};

export interface Money {
  amount: number;
  /** null = how often wasn't stated (the value can't be confirmed until it is). */
  period: Period | null;
}

export function encodeMoney(amount: number, period: Period | null): string {
  const a = formatAmount(amount);
  return period ? `${a}/${period}` : a;
}

export function parseMoney(value: string): Money | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(?:\/\s*([a-z]+))?\s*$/.exec(value);
  if (!m) return null;
  const period = (PERIODS as readonly string[]).includes(m[2] ?? "") ? (m[2] as Period) : null;
  if (m[2] && !period) return null;
  return { amount: Number(m[1]), period };
}

export function formatAmount(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

export function formatMoney(money: Money, lang: LangCode): string {
  const whole = Number.isInteger(money.amount);
  const amount = new Intl.NumberFormat(lang === "en" ? "en-US" : `${lang}-US`, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(money.amount);
  return money.period ? `${amount} ${PERIOD_LABEL[money.period][lang === "es" ? "es" : "en"]}` : amount;
}
