import { describe, expect, it } from "vitest";
import { ASK, normalizeDrafts } from "@/lib/draft/normalize";
import type { ModelDraft } from "@/lib/draft/schema";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";

const money = (field_id: string, amount: number | null, period: ModelDraft["period"], basis: ModelDraft["basis"], extra: Partial<ModelDraft> = {}): ModelDraft => ({
  field_id, value: "", amount, period, basis, unclear: false, ask_navigator: "", ...extra,
});
const plain = (field_id: string, value: string, extra: Partial<ModelDraft> = {}): ModelDraft => ({
  field_id, value, amount: null, period: "not_applicable", basis: "not_applicable", unclear: false, ask_navigator: "", ...extra,
});

describe("normalizeDrafts: money", () => {
  it("keeps a clear monthly gross amount", () => {
    expect(normalizeDrafts([money("grossMonthlyIncome", 2100, "monthly", "gross")], form)).toEqual([
      { fieldId: "grossMonthlyIncome", value: "2100", unclear: false, ask: "" },
    ]);
  });

  it("converts weekly and biweekly to monthly in code", () => {
    expect(normalizeDrafts([money("grossMonthlyIncome", 500, "weekly", "gross")], form)[0].value).toBe("2166.67");
    expect(normalizeDrafts([money("grossMonthlyIncome", 970, "biweekly", "gross")], form)[0].value).toBe("2101.67");
    expect(normalizeDrafts([money("grossMonthlyIncome", 1000, "semimonthly", "gross")], form)[0].value).toBe("2000");
    expect(normalizeDrafts([money("grossMonthlyIncome", 24000, "yearly", "gross")], form)[0].value).toBe("2000");
  });

  it("marks unclear period with a question and keeps the stated amount", () => {
    expect(normalizeDrafts([money("grossMonthlyIncome", 500, "unclear", "gross")], form)).toEqual([
      { fieldId: "grossMonthlyIncome", value: "500", unclear: true, ask: ASK.period },
    ]);
  });

  it("marks unclear gross/net", () => {
    expect(normalizeDrafts([money("grossMonthlyIncome", 2000, "monthly", "unclear")], form)[0]).toMatchObject({ unclear: true, ask: ASK.basis });
  });

  it("re-routes a net amount drafted into the gross field", () => {
    expect(normalizeDrafts([money("grossMonthlyIncome", 1850, "monthly", "net")], form)).toEqual([
      { fieldId: "netMonthlyIncome", value: "1850", unclear: false, ask: "" },
    ]);
  });

  it("keeps the model's own 'about' uncertainty", () => {
    const d = normalizeDrafts([money("grossMonthlyIncome", 2000, "monthly", "gross", { unclear: true, ask_navigator: "Ask for the exact amount." })], form)[0];
    expect(d).toMatchObject({ value: "2000", unclear: true });
  });

  it("rent has no gross/net requirement", () => {
    expect(normalizeDrafts([money("monthlyRent", 950, "monthly", "not_applicable")], form)[0]).toMatchObject({ value: "950", unclear: false });
  });
});

describe("normalizeDrafts: other fields", () => {
  it("accepts digits for household size and rejects words", () => {
    expect(normalizeDrafts([plain("householdSize", "3")], form)[0]).toMatchObject({ value: "3", unclear: false });
    expect(normalizeDrafts([plain("householdSize", "three")], form)[0]).toMatchObject({ unclear: true });
  });

  it("drops unknown fields and invalid options", () => {
    expect(normalizeDrafts([plain("ssn", "123"), plain("incomeSource", "lottery"), plain("paysUtilities", "maybe")], form)).toEqual([]);
  });

  it("last draft for a field wins", () => {
    expect(normalizeDrafts([plain("householdSize", "3"), plain("householdSize", "4")], form)).toEqual([
      { fieldId: "householdSize", value: "4", unclear: false, ask: "" },
    ]);
  });
});
