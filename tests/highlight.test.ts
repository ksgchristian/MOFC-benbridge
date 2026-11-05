import { describe, expect, it } from "vitest";
import { riskySpans } from "@/lib/highlight";

const marked = (text: string, lang: "en" | "es") => riskySpans(text, lang).map((s) => [text.slice(s.start, s.end), s.kind]);

describe("riskySpans", () => {
  it("marks spelled-out Spanish numbers, frequency and basis", () => {
    expect(marked("gano dos mil cien al mes antes de impuestos", "es")).toEqual([
      ["dos mil cien", "number"],
      ["al mes", "frequency"],
      ["antes de impuestos", "basis"],
    ]);
  });

  it("marks 'cada dos semanas' as one frequency, not a number", () => {
    expect(marked("me pagan cada dos semanas", "es")).toEqual([["cada dos semanas", "frequency"]]);
  });

  it("handles 'y' chains and accents", () => {
    expect(marked("treinta y cinco por hora, después de impuestos", "es")).toEqual([
      ["treinta y cinco", "number"],
      ["por hora", "frequency"],
      ["después de impuestos", "basis"],
    ]);
  });

  it("marks English digits, currency, words and gross/net", () => {
    expect(marked("$2,100 a month gross, about five hundred weekly net", "en")).toEqual([
      ["$2,100", "number"],
      ["a month", "frequency"],
      ["gross", "basis"],
      ["five hundred", "number"],
      ["weekly", "frequency"],
      ["net", "basis"],
    ]);
  });

  it("does not match inside other words", () => {
    expect(marked("network annually-ish", "en").map((m) => m[0])).toEqual(["annually"]);
    expect(marked("mesa", "es")).toEqual([]);
  });

  it("marks plain digits in Spanish", () => {
    expect(marked("Vivo con 3 personas", "es")).toEqual([["3", "number"]]);
  });
});
