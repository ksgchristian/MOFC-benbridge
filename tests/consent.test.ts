import { describe, expect, it } from "vitest";
import { allConsentTexts, consent } from "@/lib/glossary/consent";
import { snapSampleForm } from "@/lib/forms/snap-sample";
import { bothAgreed, initialSession, sessionReducer } from "@/lib/session/reducer";
import type { SessionAction, SessionState } from "@/lib/session/types";

const run = (s: SessionState, ...actions: SessionAction[]) => actions.reduce(sessionReducer, s);
const start = () => initialSession(snapSampleForm.id);

describe("agreement screen state", () => {
  it("starts on the agreement screen with voice and read-aloud on", () => {
    const s = start();
    expect(s.started).toBe(false);
    expect(s.prefs).toEqual({ voice: true, readAloud: true });
    expect(s.agreed).toEqual({ neighbor: false, navigator: false });
  });

  it("can't start until both people agree", () => {
    let s = run(start(), { type: "START_SESSION" });
    expect(s.started).toBe(false);

    s = run(s, { type: "SET_AGREEMENT", who: "neighbor", agreed: true }, { type: "START_SESSION" });
    expect(s.started).toBe(false);

    s = run(s, { type: "SET_AGREEMENT", who: "navigator", agreed: true });
    expect(bothAgreed(s)).toBe(true);
    s = run(s, { type: "START_SESSION" });
    expect(s.started).toBe(true);
  });

  it("tapping again undoes an agreement", () => {
    const s = run(
      start(),
      { type: "SET_AGREEMENT", who: "neighbor", agreed: true },
      { type: "SET_AGREEMENT", who: "navigator", agreed: true },
      { type: "SET_AGREEMENT", who: "neighbor", agreed: false },
      { type: "START_SESSION" },
    );
    expect(s.started).toBe(false);
  });

  it("keeps the voice / read-aloud choices, and locks them once the session starts", () => {
    let s = run(
      start(),
      { type: "SET_PREF", pref: "voice", value: false },
      { type: "SET_PREF", pref: "readAloud", value: false },
      { type: "SET_AGREEMENT", who: "neighbor", agreed: true },
      { type: "SET_AGREEMENT", who: "navigator", agreed: true },
      { type: "START_SESSION" },
    );
    expect(s.prefs).toEqual({ voice: false, readAloud: false });
    s = run(s, { type: "SET_PREF", pref: "voice", value: true }, { type: "SET_AGREEMENT", who: "neighbor", agreed: false });
    expect(s.prefs.voice).toBe(false);
    expect(s.agreed.neighbor).toBe(true);
  });

  it("End session (RESET) clears everything and returns to the agreement screen with defaults", () => {
    let s = run(
      start(),
      { type: "SET_PREF", pref: "voice", value: false },
      { type: "SET_AGREEMENT", who: "neighbor", agreed: true },
      { type: "SET_AGREEMENT", who: "navigator", agreed: true },
      { type: "START_SESSION" },
      { type: "PROPOSE_VALUE", fieldId: "householdSize", pending: { value: "3", origin: "navigator", unclear: false, ask: "" } },
    );
    s = run(s, { type: "RESET" });
    expect(s).toEqual(start());
  });
});

describe("agreement screen text (lib/glossary/consent.json)", () => {
  it("every entry has Spanish and English and a reviewed flag", () => {
    const texts = allConsentTexts();
    expect(texts.length).toBeGreaterThan(10);
    for (const t of texts) {
      expect(t.es.trim()).not.toBe("");
      expect(t.en.trim()).not.toBe("");
      expect(typeof t.reviewed).toBe("boolean");
    }
  });

  it("lists exactly the five 'always happens' points", () => {
    expect(consent.always).toHaveLength(5);
  });

  it("scopes the no-saving promise to this page", () => {
    const saving = consent.always.find((t) => /guarda/.test(t.es))!;
    expect(saving.es).toMatch(/^Esta página no guarda nada/);
    expect(saving.en).toMatch(/^This page doesn't save anything/);
  });
});
