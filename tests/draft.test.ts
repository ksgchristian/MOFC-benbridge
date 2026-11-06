import { describe, expect, it } from "vitest";
import { ASK, normalizeDrafts } from "@/lib/draft/normalize";
import type { ModelDraft } from "@/lib/draft/schema";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";

const base: Omit<ModelDraft, "field_id"> = {
  source_span: "",
  value: null,
  income_amount: null,
  income_period: null,
  income_type: null,
  household_size: null,
  household_parts: [],
};
const d = (field_id: string, extra: Partial<ModelDraft>): ModelDraft => ({ ...base, field_id, ...extra });
const income = (field_id: string, amount: number | null, period: ModelDraft["income_period"], type: ModelDraft["income_type"]) =>
  d(field_id, { income_amount: amount, income_period: period, income_type: type });

describe("guardrail 1: money is kept as stated, qualifiers required", () => {
  it("keeps amount and how often exactly as said, with no conversion", () => {
    expect(normalizeDrafts([income("grossIncome", 2100, "monthly", "gross")], form, "gano dos mil cien al mes antes de impuestos")).toEqual([
      { fieldId: "grossIncome", value: "2100/monthly", unclear: false, ask: "" },
    ]);
    expect(normalizeDrafts([income("grossIncome", 500, "weekly", "gross")], form, "quinientos a la semana antes de impuestos")[0].value).toBe("500/weekly");
    expect(normalizeDrafts([income("grossIncome", 1000, "semimonthly", "gross")], form, "mil dos veces al mes antes de impuestos")[0].value).toBe("1000/semimonthly");
  });

  it("UNCLEAR period blocks, and keeps the stated amount", () => {
    expect(normalizeDrafts([income("grossIncome", 500, "UNCLEAR", "gross")], form, "gano quinientos antes de impuestos")).toEqual([
      { fieldId: "grossIncome", value: "500", unclear: true, ask: ASK.period, reason: "period" },
    ]);
  });

  it("an omitted (null) qualifier is treated as UNCLEAR, never a default", () => {
    expect(normalizeDrafts([income("grossIncome", 500, null, "gross")], form, "quinientos")[0]).toMatchObject({ unclear: true, reason: "period" });
    expect(normalizeDrafts([income("grossIncome", 500, "weekly", null)], form, "quinientos a la semana")[0]).toMatchObject({ unclear: true, reason: "income_type" });
  });

  it("UNCLEAR gross/net blocks", () => {
    expect(normalizeDrafts([income("grossIncome", 2000, "monthly", "UNCLEAR")], form, "dos mil al mes")[0]).toMatchObject({
      value: "2000/monthly",
      unclear: true,
      reason: "income_type",
      ask: ASK.income_type,
    });
  });

  it("'quincenal' is always UNCLEAR, even if the model picked a period", () => {
    for (const line of ["me pagan mil la quincena, antes de impuestos", "gano mil quincenal brutos", "mil cada quince días antes de impuestos"]) {
      const out = normalizeDrafts([income("grossIncome", 1000, "biweekly", "gross")], form, line)[0];
      expect(out).toMatchObject({ unclear: true, reason: "quincena", value: "1000" });
    }
  });

  it("lists every question that needs asking, not just the first", () => {
    const out = normalizeDrafts([income("grossIncome", 2000, "monthly", "UNCLEAR")], form, "gano como dos mil al mes")[0];
    expect(out.reason).toBe("income_type");
    expect(out.ask).toBe(`${ASK.income_type} ${ASK.approximate}`);
  });

  it("approximate amounts are UNCLEAR (detected in code)", () => {
    for (const line of ["gano como dos mil al mes antes de impuestos", "about 2000 a month gross", "más o menos dos mil al mes brutos"]) {
      expect(normalizeDrafts([income("grossIncome", 2000, "monthly", "gross")], form, line)[0]).toMatchObject({ unclear: true, reason: "approximate" });
    }
  });

  it("'no trabajo ahora' (no amount) is never turned into 0", () => {
    const out = normalizeDrafts([income("grossIncome", null, "UNCLEAR", "UNCLEAR")], form, "no trabajo ahora")[0];
    expect(out).toMatchObject({ fieldId: "grossIncome", value: "", unclear: true, reason: "no_amount" });
  });

  it("re-routes a net amount aimed at the gross field", () => {
    expect(normalizeDrafts([income("grossIncome", 1850, "monthly", "net")], form, "mil ochocientos cincuenta al mes después de impuestos")).toEqual([
      { fieldId: "netIncome", value: "1850/monthly", unclear: false, ask: "" },
    ]);
  });

  it("rent needs how often, but not gross/net", () => {
    expect(normalizeDrafts([income("rent", 950, "monthly", null)], form, "pago 950 al mes de renta")[0]).toMatchObject({ value: "950/monthly", unclear: false });
    expect(normalizeDrafts([income("rent", 950, "UNCLEAR", null)], form, "pago 950 de renta")[0]).toMatchObject({ unclear: true, reason: "period" });
  });
});

describe("guardrail 1: household size", () => {
  it("adds up parts in code and shows the arithmetic", () => {
    const out = normalizeDrafts(
      [d("householdSize", { household_size: 5, household_parts: [{ count: 3, label: "adults" }, { count: 2, label: "children" }] })],
      form,
      "somos 3 adultos y 2 niños",
    );
    expect(out).toEqual([{ fieldId: "householdSize", value: "5", unclear: false, ask: "", math: "3 adults + 2 children = 5" }]);
  });

  it("uses the code's sum even if the model didn't give a total", () => {
    const out = normalizeDrafts([d("householdSize", { household_size: null, household_parts: [{ count: 1, label: "adult" }, { count: 2, label: "children" }] })], form, "yo y mis dos hijos");
    expect(out[0]).toMatchObject({ value: "3", math: "1 adult + 2 children = 3" });
  });

  it("parts that don't add up to the stated total are UNCLEAR", () => {
    const out = normalizeDrafts([d("householdSize", { household_size: 4, household_parts: [{ count: 3, label: "adults" }, { count: 2, label: "children" }] })], form, "x");
    expect(out[0]).toMatchObject({ unclear: true, reason: "household_math", value: "" });
  });

  it("UNCLEAR household size blocks", () => {
    expect(normalizeDrafts([d("householdSize", { household_size: "UNCLEAR" })], form, "a veces mi primo")[0]).toMatchObject({ unclear: true, reason: "household" });
  });

  it("a plain total is accepted", () => {
    expect(normalizeDrafts([d("householdSize", { household_size: 3 })], form, "somos tres")[0]).toMatchObject({ value: "3", unclear: false });
  });
});

describe("guardrail 1: other fields", () => {
  it("drops unknown fields and invalid options", () => {
    expect(
      normalizeDrafts([d("ssn", { value: "123" }), d("incomeSource", { value: "lottery" }), d("paysUtilities", { value: "maybe" })], form, "x"),
    ).toEqual([]);
  });

  it("keeps names exactly as given", () => {
    expect(normalizeDrafts([d("fullName", { value: "José Muestra Ramírez" })], form, "me llamo José Muestra Ramírez")[0].value).toBe("José Muestra Ramírez");
  });

  it("last draft for a field wins", () => {
    expect(normalizeDrafts([d("householdSize", { household_size: 3 }), d("householdSize", { household_size: 4 })], form, "x")[0].value).toBe("4");
  });
});
