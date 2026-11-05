import { describe, expect, it } from "vitest";
import { buildFormSystemPrompt, buildSystemPrompt, buildUserMessage } from "@/lib/translate/prompt";

describe("translation prompts", () => {
  it("names the direction and forbids advice/eligibility judgments", () => {
    const p = buildSystemPrompt("en", "es");
    expect(p).toContain("from English to Spanish");
    expect(p).toMatch(/do not answer questions, give advice/i);
    expect(p).toMatch(/judge eligibility/i);
  });

  it("includes the glossary in both directions", () => {
    expect(buildSystemPrompt("en", "es")).toContain("ingresos brutos");
    expect(buildSystemPrompt("es", "en")).toContain("ingresos brutos");
  });

  it("is identical across calls (prompt-cache friendly)", () => {
    expect(buildSystemPrompt("es", "en")).toBe(buildSystemPrompt("es", "en"));
  });

  it("wraps user text in <source> tags", () => {
    expect(buildUserMessage("hola", "conversation")).toMatch(/<source>\nhola\n<\/source>/);
  });

  it("form prompt does not ask for uncertainty fields", () => {
    expect(buildFormSystemPrompt("es")).not.toContain("uncertainty_note");
  });
});
