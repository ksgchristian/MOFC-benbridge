import { describe, expect, it } from "vitest";
import { findGlossaryHits, formatGlossaryForPrompt, getGlossary } from "@/lib/glossary";

describe("glossary", () => {
  it("has a Spanish glossary with gross/net income kept distinct", () => {
    const es = getGlossary("es");
    expect(es.find((e) => e.en === "gross income")?.es).toBe("ingresos brutos");
    expect(es.find((e) => e.en === "net income")?.es).toBe("ingresos netos");
  });

  it("finds English terms when translating en → es", () => {
    const hits = findGlossaryHits("What is your gross income each month?", "en", "es");
    expect(hits.map((h) => h.en)).toContain("gross income");
    expect(hits.map((h) => h.en)).not.toContain("net income");
  });

  it("finds Spanish terms when translating es → en, case-insensitively", () => {
    const hits = findGlossaryHits("Mis INGRESOS BRUTOS son 2100", "es", "en");
    expect(hits).toEqual([expect.objectContaining({ en: "gross income", translation: "ingresos brutos" })]);
  });

  it("matches whole words only", () => {
    // "rent" must not match inside "current"
    expect(findGlossaryHits("my current job", "en", "es").map((h) => h.en)).not.toContain("rent");
  });

  it("returns nothing for English-only pairs", () => {
    expect(findGlossaryHits("gross income", "en", "en")).toEqual([]);
  });

  it("formats a stable prompt block", () => {
    const a = formatGlossaryForPrompt("es");
    expect(a).toContain('"gross income" = "ingresos brutos"');
    expect(formatGlossaryForPrompt("es")).toBe(a);
  });
});
