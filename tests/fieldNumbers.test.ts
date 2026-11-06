import { describe, expect, it } from "vitest";
import { allFields } from "@/lib/forms/schema";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";
import { numbersCheckOut, parseHouseholdMath } from "@/lib/verify/fieldNumbers";

const field = (id: string) => allFields(form).find((f) => f.id === id)!;

describe("numbersCheckOut (browser re-check before rendering)", () => {
  it("money: the stated amount must be in the quote", () => {
    expect(numbersCheckOut(field("grossIncome"), "500/weekly", "quinientos a la semana")).toBe(true);
    expect(numbersCheckOut(field("grossIncome"), "2166.67/monthly", "quinientos a la semana")).toBe(false);
  });

  it("household with math: parts in the quote and total equals the sum", () => {
    expect(numbersCheckOut(field("householdSize"), "5", "3 adultos y 2 niños", "3 adults + 2 children = 5")).toBe(true);
    expect(numbersCheckOut(field("householdSize"), "6", "3 adultos y 2 niños", "3 adults + 2 children = 6")).toBe(false);
  });

  it("non-numeric fields always pass", () => {
    expect(numbersCheckOut(field("fullName"), "María", "me llamo María")).toBe(true);
  });

  it("parses the household math made in code", () => {
    expect(parseHouseholdMath("3 adults + 2 children = 5")).toEqual({ counts: [3, 2], total: 5 });
    expect(parseHouseholdMath("nonsense")).toBeNull();
  });
});
