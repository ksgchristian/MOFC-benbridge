import { describe, expect, it } from "vitest";
import { buildDraftSystemPrompt } from "@/lib/draft/prompt";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";

describe("extraction prompt (prompts/extraction.md)", () => {
  const prompt = buildDraftSystemPrompt(form);

  it("fills every placeholder", () => {
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("teaches the same qualifier words the code checks (one list)", () => {
    expect(prompt).toMatch(/income_type = net:.*"me quedan"/);
    expect(prompt).toMatch(/income_period = semimonthly:.*"dos veces al mes"/);
  });

  it("is the same on every call (cacheable)", () => {
    expect(buildDraftSystemPrompt(form)).toBe(prompt);
  });
});
