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
/** Runs normalize with the quote defaulting to the whole line (provenance has its own tests below). */
const norm = (drafts: ModelDraft[], f: typeof form, line: string) =>
  normalizeDrafts(drafts.map((x) => (x.source_span ? x : { ...x, source_span: line })), f, line);
const income = (field_id: string, amount: number | null, period: ModelDraft["income_period"], type: ModelDraft["income_type"]) =>
  d(field_id, { income_amount: amount, income_period: period, income_type: type });

describe("guardrail 1: money is kept as stated, qualifiers required", () => {
  it("keeps amount and how often exactly as said, with no conversion", () => {
    expect(norm([income("grossIncome", 2100, "monthly", "gross")], form, "gano dos mil cien al mes antes de impuestos")).toEqual([
      { fieldId: "grossIncome", value: "2100/monthly", unclear: false, ask: "", quote: "gano dos mil cien al mes antes de impuestos" },
    ]);
    expect(norm([income("grossIncome", 500, "weekly", "gross")], form, "quinientos a la semana antes de impuestos")[0].value).toBe("500/weekly");
    expect(norm([income("grossIncome", 1000, "semimonthly", "gross")], form, "mil dos veces al mes antes de impuestos")[0].value).toBe("1000/semimonthly");
  });

  it("UNCLEAR period blocks, and keeps the stated amount", () => {
    expect(norm([income("grossIncome", 500, "UNCLEAR", "gross")], form, "gano quinientos antes de impuestos")).toEqual([
      { fieldId: "grossIncome", value: "500", unclear: true, ask: ASK.period, reason: "period", quote: "gano quinientos antes de impuestos" },
    ]);
  });

  it("an omitted (null) qualifier is treated as UNCLEAR, never a default", () => {
    expect(norm([income("grossIncome", 500, null, "gross")], form, "quinientos")[0]).toMatchObject({ unclear: true, reason: "period" });
    expect(norm([income("grossIncome", 500, "weekly", null)], form, "quinientos a la semana")[0]).toMatchObject({ unclear: true, reason: "income_type" });
  });

  it("UNCLEAR gross/net blocks", () => {
    expect(norm([income("grossIncome", 2000, "monthly", "UNCLEAR")], form, "dos mil al mes")[0]).toMatchObject({
      value: "2000/monthly",
      unclear: true,
      reason: "income_type",
      ask: ASK.income_type,
    });
  });

  it("'quincenal' is always UNCLEAR, even if the model picked a period", () => {
    for (const line of ["me pagan mil la quincena, antes de impuestos", "gano mil quincenal brutos", "mil cada quince días antes de impuestos"]) {
      const out = norm([income("grossIncome", 1000, "biweekly", "gross")], form, line)[0];
      expect(out).toMatchObject({ unclear: true, reason: "quincena", value: "1000" });
    }
  });

  it("lists every question that needs asking, not just the first", () => {
    const out = norm([income("grossIncome", 2000, "monthly", "UNCLEAR")], form, "gano como dos mil al mes")[0];
    expect(out.reason).toBe("income_type");
    expect(out.ask).toBe(`${ASK.income_type} ${ASK.approximate}`);
  });

  it("approximate amounts are UNCLEAR (detected in code)", () => {
    for (const line of ["gano como dos mil al mes antes de impuestos", "about 2000 a month gross", "más o menos dos mil al mes brutos"]) {
      expect(norm([income("grossIncome", 2000, "monthly", "gross")], form, line)[0]).toMatchObject({ unclear: true, reason: "approximate" });
    }
  });

  it("'no trabajo ahora' (no amount) is never turned into 0", () => {
    const out = norm([income("grossIncome", null, "UNCLEAR", "UNCLEAR")], form, "no trabajo ahora")[0];
    expect(out).toMatchObject({ fieldId: "grossIncome", value: "", unclear: true, reason: "no_amount" });
  });

  it("re-routes a net amount aimed at the gross field", () => {
    expect(norm([income("grossIncome", 1850, "monthly", "net")], form, "mil ochocientos cincuenta al mes después de impuestos")).toEqual([
      { fieldId: "netIncome", value: "1850/monthly", unclear: false, ask: "", quote: "mil ochocientos cincuenta al mes después de impuestos" },
    ]);
  });

  it("rent needs how often, but not gross/net", () => {
    expect(norm([income("rent", 950, "monthly", null)], form, "pago 950 al mes de renta")[0]).toMatchObject({ value: "950/monthly", unclear: false });
    expect(norm([income("rent", 950, "UNCLEAR", null)], form, "pago 950 de renta")[0]).toMatchObject({ unclear: true, reason: "period" });
  });
});

describe("guardrail 1: household size", () => {
  it("adds up parts in code and shows the arithmetic", () => {
    const out = norm(
      [d("householdSize", { household_size: 5, household_parts: [{ count: 3, label: "adults" }, { count: 2, label: "children" }] })],
      form,
      "somos 3 adultos y 2 niños",
    );
    expect(out).toEqual([{ fieldId: "householdSize", value: "5", unclear: false, ask: "", math: "3 adults + 2 children = 5", quote: "somos 3 adultos y 2 niños" }]);
  });

  it("uses the code's sum even if the model didn't give a total", () => {
    const out = norm([d("householdSize", { household_size: null, household_parts: [{ count: 1, label: "adult" }, { count: 2, label: "children" }] })], form, "yo y mis dos hijos");
    expect(out[0]).toMatchObject({ value: "3", math: "1 adult + 2 children = 3" });
  });

  it("parts that don't add up to the stated total are UNCLEAR", () => {
    const out = norm([d("householdSize", { household_size: 4, household_parts: [{ count: 3, label: "adults" }, { count: 2, label: "children" }] })], form, "x");
    expect(out[0]).toMatchObject({ unclear: true, reason: "household_math", value: "" });
  });

  it("UNCLEAR household size blocks", () => {
    expect(norm([d("householdSize", { household_size: "UNCLEAR" })], form, "a veces mi primo")[0]).toMatchObject({ unclear: true, reason: "household" });
  });

  it("a plain total is accepted", () => {
    expect(norm([d("householdSize", { household_size: 3 })], form, "somos tres")[0]).toMatchObject({ value: "3", unclear: false });
  });
});

describe("guardrail 1: other fields", () => {
  it("drops unknown fields and invalid options", () => {
    expect(
      norm([d("ssn", { value: "123" }), d("incomeSource", { value: "lottery" }), d("paysUtilities", { value: "maybe" })], form, "x"),
    ).toEqual([]);
  });

  it("keeps names exactly as given", () => {
    expect(norm([d("fullName", { value: "José Muestra Ramírez" })], form, "me llamo José Muestra Ramírez")[0].value).toBe("José Muestra Ramírez");
  });

  it("last draft for a field wins", () => {
    expect(norm([d("householdSize", { household_size: 3 }), d("householdSize", { household_size: 4 })], form, "somos tres, no, somos cuatro")[0].value).toBe("4");
  });
});

describe("guardrail 2: provenance", () => {
  const line = "Gano 2,100 al mes antes de impuestos";
  const g = (span: string) => normalizeDrafts([{ ...income("grossIncome", 2100, "monthly", "gross"), source_span: span }], form, line);

  it("keeps the exact words a value came from", () => {
    expect(g("Gano 2,100 al mes antes de impuestos")[0]).toMatchObject({ value: "2100/monthly", unclear: false, quote: "Gano 2,100 al mes antes de impuestos" });
  });

  it("matches the quote ignoring only case and spacing", () => {
    expect(g("gano  2,100 AL MES")[0]).toMatchObject({ unclear: false, quote: "gano  2,100 AL MES" });
  });

  it("no quote, or a quote that isn't in the line, means UNCLEAR and no value shown", () => {
    for (const span of ["", "Gano 2.100 mensuales", "I earn 2,100 a month"]) {
      expect(g(span)[0]).toMatchObject({ fieldId: "grossIncome", value: "", unclear: true, reason: "no_source", quote: "" });
    }
  });

  it("names must appear verbatim in the quote (no translating or 'fixing')", () => {
    const l = "me llamo Jose Muestra";
    const ok = normalizeDrafts([{ ...d("fullName", { value: "Jose Muestra" }), source_span: "Jose Muestra" }], form, l)[0];
    expect(ok).toMatchObject({ value: "Jose Muestra", unclear: false });
    const fixed = normalizeDrafts([{ ...d("fullName", { value: "José Muestra" }), source_span: "Jose Muestra" }], form, l)[0];
    expect(fixed).toMatchObject({ value: "", unclear: true, reason: "no_source" });
  });
});

describe("guardrail 3: numbers must appear in the quote", () => {
  it("hides an amount the speaker didn't say", () => {
    const line = "gano dos mil cien al mes antes de impuestos";
    const out = normalizeDrafts([{ ...income("grossIncome", 2000, "monthly", "gross"), source_span: line }], form, line)[0];
    expect(out).toMatchObject({ value: "", unclear: true, reason: "number_unverified", quote: line });
  });

  it("accepts the amount as digits or words", () => {
    for (const line of ["Gano 2,100 al mes antes de impuestos", "gano dos mil cien al mes antes de impuestos"]) {
      expect(normalizeDrafts([{ ...income("grossIncome", 2100, "monthly", "gross"), source_span: line }], form, line)[0]).toMatchObject({ value: "2100/monthly", unclear: false });
    }
  });

  it("household: every part must be said (except 'one', as in 'yo'), and the total is the code's sum", () => {
    const parts = (line: string, ps: { count: number; label: string }[]) =>
      normalizeDrafts([{ ...d("householdSize", { household_size: null, household_parts: ps }), source_span: line }], form, line)[0];
    expect(parts("tres adultos y dos niños", [{ count: 3, label: "adults" }, { count: 2, label: "children" }])).toMatchObject({ value: "5", unclear: false });
    expect(parts("yo y mis dos hijos", [{ count: 1, label: "adult" }, { count: 2, label: "children" }])).toMatchObject({ value: "3", unclear: false });
    expect(parts("tres adultos y dos niños", [{ count: 3, label: "adults" }, { count: 3, label: "children" }])).toMatchObject({ value: "", reason: "number_unverified" });
  });

  it("a plain household total must be said", () => {
    const line = "somos tres";
    expect(normalizeDrafts([{ ...d("householdSize", { household_size: 4 }), source_span: line }], form, line)[0]).toMatchObject({ value: "", reason: "number_unverified" });
  });
});
