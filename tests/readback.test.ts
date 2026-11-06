import { describe, expect, it } from "vitest";
import { allFields, type LocalizedText } from "@/lib/forms/schema";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";
import { allReadbackTexts, buildReadback, readbackToString } from "@/lib/readback";

const t = (_k: string, text: LocalizedText | undefined) => text?.es ?? text?.en ?? "";
const tEn = (_k: string, text: LocalizedText | undefined) => text?.en ?? "";
const field = (id: string) => allFields(form).find((f) => f.id === id)!;

describe("guardrail 4: read-back questions", () => {
  it("asks about income with amount, how often, and before/after taxes", () => {
    expect(readbackToString(buildReadback(field("grossIncome"), "2100/monthly", "es", t))).toBe("¿Gana $2,100 al mes, antes de impuestos?");
    expect(readbackToString(buildReadback(field("grossIncome"), "500/weekly", "es", t))).toBe("¿Gana $500 a la semana, antes de impuestos?");
    expect(readbackToString(buildReadback(field("netIncome"), "1850/monthly", "en", tEn))).toBe("Do you take home $1,850 per month, after taxes?");
  });

  it("marks the answer itself (numbers, units) for large display", () => {
    const segs = buildReadback(field("grossIncome"), "2100/monthly", "es", t);
    expect(segs.filter((x) => x.emphasis).map((x) => x.text)).toEqual(["$2,100", "al mes"]);
  });

  it("yes/no fields ask the question that matches the answer", () => {
    expect(readbackToString(buildReadback(field("paysUtilities"), "no", "es", t))).toBe("¿Usted no paga servicios públicos (gas, luz, agua)?");
    expect(readbackToString(buildReadback(field("householdSize"), "3", "es", t))).toBe("¿Son 3 personas en su hogar?");
  });

  it("fields without their own question use the default", () => {
    expect(readbackToString(buildReadback({ id: "other", type: "text", label: { en: "Other" } }, "abc", "es", t))).toBe("Anotamos: abc. ¿Es correcto?");
  });

  it("every entry has Spanish and English, a reviewed flag, and only known placeholders", () => {
    for (const r of allReadbackTexts()) {
      expect(r.es.trim()).not.toBe("");
      expect(r.en.trim()).not.toBe("");
      expect(typeof r.reviewed).toBe("boolean");
      expect(r.es.replace(/\{(value|amount|period)\}/g, "")).not.toMatch(/[{}]/);
    }
  });

  it("every field in the sample form has its own question", () => {
    const own = allFields(form).filter((f) => readbackToString(buildReadback(f, f.type === "money" ? "1/monthly" : "x", "es", t)).startsWith("Anotamos"));
    expect(own.map((f) => f.id)).toEqual([]);
  });
});
