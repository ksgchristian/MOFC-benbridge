import { describe, expect, it } from "vitest";
import { allQualifierEntries, qualifierMarkers, verifyQualifier } from "@/lib/verify/qualifiers";

describe("qualifier check: income_type", () => {
  it.each([
    ["gross", "gano 2,100 al mes antes de impuestos"],
    ["gross", "gano dos mil brutos al mes"],
    ["gross", "I make 2100 a month before taxes"],
    ["net", "mil ochocientos cincuenta al mes después de impuestos"],
    ["net", "me quedan mil ochocientos al mes"],
    ["net", "me queda libre como mil ochocientos"],
    ["net", "en limpio son mil ochocientos"],
    ["net", "lo que me llevo a casa son mil ochocientos al mes"],
    ["net", "despues de descuentos 1850"],
    ["net", "my take-home is 1850 a month"],
  ])("supports %s in %j", (claimed, quote) => {
    expect(verifyQualifier("income_type", claimed, quote)).toBe("supported");
  });

  it("contradiction: model says gross, quote says after taxes", () => {
    expect(verifyQualifier("income_type", "gross", "gano 1850 al mes después de impuestos")).toBe("contradicted");
    expect(verifyQualifier("income_type", "net", "gano 2100 brutos")).toBe("contradicted");
  });

  it("both markers in one quote is a contradiction, not support", () => {
    expect(verifyQualifier("income_type", "gross", "2100 antes de impuestos, 1850 después de impuestos")).toBe("contradicted");
  });

  it("unsupported: a label with nothing in the text behind it", () => {
    expect(verifyQualifier("income_type", "gross", "gano dos mil cien al mes")).toBe("unsupported");
    expect(verifyQualifier("income_type", "net", "gano dos mil cien al mes")).toBe("unsupported");
  });

  it("whole words only, accents and case ignored", () => {
    expect(verifyQualifier("income_type", "net", "trabajo en networking")).toBe("unsupported");
    expect(verifyQualifier("income_type", "net", "DESPUES DE IMPUESTOS")).toBe("supported");
  });
});

describe("qualifier check: income_period", () => {
  it.each([
    ["monthly", "gano 2,100 al mes antes de impuestos"],
    ["monthly", "ingresos brutos mensuales de 2100"],
    ["weekly", "me pagan quinientos a la semana"],
    ["biweekly", "novecientos setenta cada dos semanas"],
    ["biweekly", "970 every other week"],
    ["semimonthly", "mil dos veces al mes"],
    ["annual", "veinticuatro mil al año"],
  ])("supports %s in %j", (claimed, quote) => {
    expect(verifyQualifier("income_period", claimed, quote)).toBe("supported");
  });

  it("'dos veces al mes' is twice a month, not monthly", () => {
    expect([...qualifierMarkers("income_period", "mil dos veces al mes")]).toEqual(["semimonthly"]);
    expect(verifyQualifier("income_period", "monthly", "mil dos veces al mes")).toBe("contradicted");
  });

  it("contradiction and unsupported", () => {
    expect(verifyQualifier("income_period", "monthly", "quinientos a la semana")).toBe("contradicted");
    expect(verifyQualifier("income_period", "monthly", "gano dos mil cien")).toBe("unsupported");
  });

  it("quincena supports no period", () => {
    for (const p of ["weekly", "biweekly", "semimonthly", "monthly"]) {
      expect(verifyQualifier("income_period", p, "me pagan mil la quincena")).toBe("unsupported");
    }
  });
});

describe("qualifier word list", () => {
  it("every entry is marked for review and has words", () => {
    const entries = allQualifierEntries();
    expect(entries.map((e) => `${e.kind}.${e.value}`).sort()).toEqual(
      ["income_period.annual", "income_period.biweekly", "income_period.monthly", "income_period.semimonthly", "income_period.weekly", "income_type.gross", "income_type.net"],
    );
    for (const { entry } of entries) {
      expect(entry.reviewed).toBe(false);
      expect(entry.es.length + entry.en.length).toBeGreaterThan(0);
    }
  });
});
