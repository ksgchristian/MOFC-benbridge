import { describe, expect, it } from "vitest";
import { snapSampleForm } from "@/lib/forms/snap-sample";
import { sampleNeighbors } from "@/lib/forms/sample-neighbors";
import { collectMissingLabels } from "@/lib/forms/useFormLabels";
import { initialSession, sessionReducer, submitReadiness } from "@/lib/session/reducer";
import { allFields } from "@/lib/forms/schema";

const start = () => initialSession(snapSampleForm.id);

describe("session reducer", () => {
  it("changing a value clears the neighbor's confirmation", () => {
    let s = sessionReducer(start(), { type: "SET_FIELD", fieldId: "fullName", value: "A" });
    s = sessionReducer(s, { type: "CONFIRM_FIELD", fieldId: "fullName", confirmed: true });
    expect(s.fields.fullName.confirmed).toBe(true);
    s = sessionReducer(s, { type: "SET_FIELD", fieldId: "fullName", value: "B" });
    expect(s.fields.fullName).toEqual({ value: "B", confirmed: false });
  });

  it("cannot confirm an empty field", () => {
    const s = sessionReducer(start(), { type: "CONFIRM_FIELD", fieldId: "fullName", confirmed: true });
    expect(s.fields.fullName).toBeUndefined();
  });

  it("freezes the form after submit", () => {
    let s = sessionReducer(start(), { type: "SUBMIT" });
    s = sessionReducer(s, { type: "SET_FIELD", fieldId: "fullName", value: "X" });
    expect(s.fields.fullName).toBeUndefined();
  });
});

describe("submit guardrail", () => {
  it("blocks submit until required fields are filled and everything is confirmed", () => {
    let s = start();
    expect(submitReadiness(s, snapSampleForm).ready).toBe(false);

    s = sessionReducer(s, { type: "LOAD_VALUES", values: sampleNeighbors[0].values });
    const r = submitReadiness(s, snapSampleForm);
    expect(r.missingRequired).toEqual([]);
    expect(r.unconfirmed.length).toBeGreaterThan(0);
    expect(r.ready).toBe(false);

    for (const id of Object.keys(sampleNeighbors[0].values)) {
      s = sessionReducer(s, { type: "CONFIRM_FIELD", fieldId: id, confirmed: true });
    }
    expect(submitReadiness(s, snapSampleForm).ready).toBe(true);
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
