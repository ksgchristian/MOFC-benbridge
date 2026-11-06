import { describe, expect, it } from "vitest";
import { mentionsNumber, valueUnread } from "@/lib/draft/unread";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";
import { initialSession, sessionReducer } from "@/lib/session/reducer";

describe("catch-all: a number that drafted nothing is never silent", () => {
  it("flags a line with a number and no drafts", () => {
    expect(valueUnread("gano dos mil", 0)).toBe(true);
    expect(valueUnread("gano 2000", 0)).toBe(true);
    expect(valueUnread("tengo 3 hijos", 0)).toBe(true);
    expect(valueUnread("somos uno nomás", 0)).toBe(true);
  });

  it("doesn't flag a line that drafted something", () => {
    expect(valueUnread("gano dos mil", 1)).toBe(false);
  });

  it("doesn't flag lines with no number (articles aren't numbers)", () => {
    expect(mentionsNumber("hola, buenos días")).toBe(false);
    expect(mentionsNumber("tengo una pregunta")).toBe(false);
    expect(mentionsNumber("vivo con un amigo")).toBe(false);
    expect(mentionsNumber("I have a question")).toBe(false);
    expect(mentionsNumber("no trabajo ahora")).toBe(false);
  });

  it("marks the message so the navigator sees “ask again”", () => {
    let s = sessionReducer(initialSession(form.id), {
      type: "ADD_MESSAGE",
      message: { id: "m1", speaker: "neighbor", createdAt: 0, original: { lang: "es", text: "gano dos mil" }, status: "done" },
    });
    s = sessionReducer(s, { type: "SET_MESSAGE_UNREAD", id: "m1" });
    expect(s.messages[0].valueUnread).toBe(true);
  });
});
