import { describe, expect, it } from "vitest";
import { pickVoice } from "@/lib/speech/voices";

const v = (name: string, lang: string) => ({ name, lang });

describe("pickVoice", () => {
  it("prefers enhanced/premium voices over the default", () => {
    const voices = [v("Mónica", "es-ES"), v("Paulina", "es-MX"), v("Paulina (Enhanced)", "es-MX"), v("Jorge", "es-ES")];
    expect(pickVoice(voices, "es-US")?.name).toBe("Paulina (Enhanced)");
  });

  it("prefers Latin American Spanish when there's no es-US voice", () => {
    expect(pickVoice([v("Jorge", "es-ES"), v("Juan", "es-MX")], "es-US")?.name).toBe("Juan");
  });

  it("uses Google / Microsoft natural voices when present", () => {
    const voices = [v("Fred", "en-US"), v("Google US English", "en-US"), v("Microsoft Aria Online (Natural) - English (United States)", "en-US")];
    expect(pickVoice(voices, "en-US")?.name).toMatch(/Aria|Google/);
  });

  it("never picks novelty voices, and returns null when nothing matches", () => {
    expect(pickVoice([v("Bad News", "en-US"), v("Zarvox", "en-US")], "en-US")).toBeNull();
    expect(pickVoice([v("Thomas", "fr-FR")], "es-US")).toBeNull();
  });

  it("handles underscore language tags", () => {
    expect(pickVoice([v("Samantha", "en_US")], "en-US")?.name).toBe("Samantha");
  });
});
