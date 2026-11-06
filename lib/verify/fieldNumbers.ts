import { parseMoney } from "@/lib/forms/money";
import type { FormField } from "@/lib/forms/schema";
import { verifyNumber, verifyNumbers } from "./numbers";

/** Parse the parts out of household math made in code: "3 adults + 2 children = 5". */
export function parseHouseholdMath(math: string): { counts: number[]; total: number } | null {
  const m = /^(.*)=\s*(\d+)\s*$/.exec(math);
  if (!m) return null;
  const counts = [...m[1].matchAll(/(\d+)\s+[^+]+/g)].map((x) => Number(x[1]));
  return counts.length ? { counts, total: Number(m[2]) } : null;
}

/**
 * Guardrail 3: do the numbers in this value really appear in the quote it
 * came from? Used on the server when drafting AND in the browser right before
 * a number is shown. Non-numeric fields always pass.
 *
 * Household parts: a count of 1 is not required to appear as a number, since
 * people say "yo" or "mi esposa", not "one". Every other count must, and the
 * total must equal the sum.
 */
export function numbersCheckOut(field: FormField, value: string, quote: string, math?: string): boolean {
  switch (field.type) {
    case "money": {
      const money = parseMoney(value);
      return money ? verifyNumber(money.amount, quote) : value === "";
    }
    case "number": {
      if (value === "") return true;
      if (math) {
        const parsed = parseHouseholdMath(math);
        if (!parsed) return false;
        const sumOk = parsed.counts.reduce((a, b) => a + b, 0) === parsed.total && String(parsed.total) === value;
        // Each count (other than 1) must match its own mention: [3, 3] doesn't pass on "tres … dos".
        return sumOk && verifyNumbers(parsed.counts.filter((c) => c !== 1), quote);
      }
      return verifyNumber(Number(value), quote);
    }
    default:
      return true;
  }
}
