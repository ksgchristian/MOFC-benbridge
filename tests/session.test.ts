import { describe, expect, it } from "vitest";
import { snapSampleForm } from "@/lib/forms/snap-sample";
import { sampleNeighbors } from "@/lib/forms/sample-neighbors";
import { collectMissingLabels } from "@/lib/forms/useFormLabels";
import { initialSession, sessionReducer, submitReadiness } from "@/lib/session/reducer";
import { allFields } from "@/lib/forms/schema";

const start = () => initialSession(snapSampleForm.id);

const propose = (fieldId: string, value: string, extra: Partial<{ origin: "claude" | "navigator"; unclear: boolean; ask: string }> = {}) =>
  ({ type: "PROPOSE_VALUE", fieldId, pending: { value, origin: "claude", unclear: false, ask: "", ...extra } }) as const;

describe("draft → neighbor Yes/No → navigator Confirm", () => {
  it("navigator can't confirm until the neighbor says Yes", () => {
    let s = sessionReducer(start(), propose("householdSize", "3"));
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" });
    expect(s.fields.householdSize.confirmed).toBe(false);

    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "householdSize", answer: "yes" });
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" });
    expect(s.fields.householdSize).toMatchObject({ value: "3", confirmed: true });
  });

  it("unclear drafts can't be answered or confirmed", () => {
    let s = sessionReducer(start(), propose("grossIncome", "500", { unclear: true, ask: "per week or per month?" }));
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "grossIncome", answer: "yes" });
    expect(s.fields.grossIncome.neighborAnswer).toBeUndefined();
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "grossIncome" });
    expect(s.fields.grossIncome.confirmed).toBe(false);
  });

  it("a value with nothing to show can't be answered", () => {
    let s = sessionReducer(start(), propose("grossIncome", ""));
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "grossIncome", answer: "yes" });
    expect(s.fields.grossIncome.neighborAnswer).toBeUndefined();
  });

  it("a new value clears the neighbor's answer but keeps the old confirmed value until re-confirmed", () => {
    let s = sessionReducer(start(), propose("householdSize", "3"));
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "householdSize", answer: "yes" });
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" });
    s = sessionReducer(s, propose("householdSize", "4", { origin: "navigator" }));
    expect(s.fields.householdSize).toMatchObject({ value: "3", confirmed: true, pending: { value: "4" } });
    expect(s.fields.householdSize.neighborAnswer).toBeUndefined();
    expect(submitReadiness(s, snapSampleForm).pending).toContain("householdSize");
  });

  it("an unclear draft is only replaced by a new, complete answer", () => {
    let s = sessionReducer(start(), propose("grossIncome", "2000", { unclear: true, ask: "before or after taxes?" }));
    s = sessionReducer(s, propose("grossIncome", "2000/monthly", { quote: "dos mil al mes antes de impuestos" } as never));
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "grossIncome", answer: "yes" });
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "grossIncome" });
    expect(s.fields.grossIncome).toMatchObject({ value: "2000/monthly", confirmed: true });
  });
});

describe("guardrail 4: the neighbor's No is final", () => {
  const rejected = () => {
    let s = sessionReducer(start(), propose("householdSize", "3"));
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "householdSize", answer: "no" });
    return s;
  };

  it("No sets the value aside: nothing left to answer or confirm", () => {
    const s = rejected();
    expect(s.fields.householdSize.pending).toBeUndefined();
    expect(s.fields.householdSize.rejected).toMatchObject({ value: "3" });
    expect(s.fields.householdSize.confirmed).toBe(false);
  });

  it("No can't be switched back to Sí, and Confirm does nothing", () => {
    let s = rejected();
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "householdSize", answer: "yes" });
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" });
    expect(s.fields.householdSize.confirmed).toBe(false);
    expect(s.fields.householdSize.neighborAnswer).toBeUndefined();
  });

  it("a new answer (said again or re-typed) clears the rejection and must be answered again", () => {
    let s = rejected();
    s = sessionReducer(s, propose("householdSize", "4", { origin: "navigator" }));
    expect(s.fields.householdSize.rejected).toBeUndefined();
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" });
    expect(s.fields.householdSize.confirmed).toBe(false);
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "householdSize", answer: "yes" });
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" });
    expect(s.fields.householdSize).toMatchObject({ value: "4", confirmed: true });
  });

  it("a rejected field still blocks submit if it's required", () => {
    expect(submitReadiness(rejected(), snapSampleForm).missingRequired).toContain("householdSize");
  });

  it("a confirmed value can be corrected and confirmed again", () => {
    let s = sessionReducer(start(), propose("householdSize", "3"));
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "householdSize", answer: "yes" });
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" });
    s = sessionReducer(s, propose("householdSize", "4", { origin: "navigator" }));
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "householdSize", answer: "yes" });
    s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" });
    expect(s.fields.householdSize).toMatchObject({ value: "4", confirmed: true });
  });

  it("discard drops the pending value", () => {
    let s = sessionReducer(start(), propose("householdSize", "3"));
    s = sessionReducer(s, { type: "DISCARD_PENDING", fieldId: "householdSize" });
    expect(s.fields.householdSize.pending).toBeUndefined();
  });

  it("freezes the form after submit", () => {
    let s = sessionReducer(start(), { type: "SUBMIT" });
    s = sessionReducer(s, propose("fullName", "X"));
    expect(s.fields.fullName).toBeUndefined();
  });
});

describe("guardrail 2: the record keeps where a value came from", () => {
  const confirmWith = (pending: Parameters<typeof propose>[2] & { quote?: string }) => {
    let s = sessionReducer(start(), { type: "PROPOSE_VALUE", fieldId: "householdSize", pending: { value: "3", origin: "claude", unclear: false, ask: "", ...pending } });
    s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: "householdSize", answer: "yes" });
    return sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: "householdSize" }).fields.householdSize;
  };
  it("a drafted value keeps its quote", () => {
    expect(confirmWith({ quote: "somos tres" })).toEqual({ value: "3", confirmed: true, source: { kind: "transcript", quote: "somos tres" } });
  });
  it("a typed value is marked as entered by the navigator", () => {
    expect(confirmWith({ origin: "navigator" })).toEqual({ value: "3", confirmed: true, source: { kind: "navigator" } });
  });
});

describe("current question", () => {
  it("is shared state that can be set, moved and cleared, and resets with the session", () => {
    let s = sessionReducer(start(), { type: "SET_ACTIVE_FIELD", fieldId: "householdSize" });
    expect(s.activeFieldId).toBe("householdSize");
    s = sessionReducer(s, { type: "SET_ACTIVE_FIELD", fieldId: "grossIncome" });
    expect(s.activeFieldId).toBe("grossIncome");
    s = sessionReducer(s, { type: "SET_ACTIVE_FIELD", fieldId: null });
    expect(s.activeFieldId).toBeNull();
    s = sessionReducer(sessionReducer(s, { type: "SET_ACTIVE_FIELD", fieldId: "fullName" }), { type: "RESET" });
    expect(s.activeFieldId).toBeNull();
  });
});

describe("submit guardrail", () => {
  it("blocks submit until every value is answered Yes and confirmed", () => {
    let s = start();
    expect(submitReadiness(s, snapSampleForm).ready).toBe(false);

    s = sessionReducer(s, { type: "LOAD_VALUES", values: sampleNeighbors[0].values });
    let r = submitReadiness(s, snapSampleForm);
    expect(r.pending.length).toBe(Object.keys(sampleNeighbors[0].values).length);
    expect(r.ready).toBe(false);

    for (const id of Object.keys(sampleNeighbors[0].values)) {
      s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: id, answer: "yes" });
      s = sessionReducer(s, { type: "NAVIGATOR_CONFIRM", fieldId: id });
    }
    r = submitReadiness(s, snapSampleForm);
    expect(r).toEqual({ ready: true, missingRequired: [], pending: [] });
  });
});

describe("sample data", () => {
  it("sample neighbors only use field ids that exist in the form", () => {
    const ids = new Set(allFields(snapSampleForm).map((f) => f.id));
    for (const n of sampleNeighbors) for (const k of Object.keys(n.values)) expect(ids).toContain(k);
  });

  it("finds labels without approved Spanish (the machine-translation demo field)", () => {
    expect(Object.keys(collectMissingLabels(snapSampleForm, "es"))).toEqual(["field.hasChildrenUnder18.label"]);
    expect(collectMissingLabels(snapSampleForm, "en")).toEqual({});
  });
});
