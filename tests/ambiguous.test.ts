import { describe, expect, it } from "vitest";
import { ASK, normalizeDrafts } from "@/lib/draft/normalize";
import type { ModelDraft, UnclearReason } from "@/lib/draft/schema";
import { snapSampleForm as form } from "@/lib/forms/snap-sample";
import { canConfirm, initialSession, sessionReducer } from "@/lib/session/reducer";

/**
 * Regression: an ambiguous line must never be silently dropped. Each case is
 * the model output for a line that once came back as nothing ("gano dos mil"
 * returned no drafts at all). With the field present and its labels UNCLEAR,
 * the line must end up as a pending value the navigator can see: the amount
 * (if any), Confirm blocked, and a non-empty "Ask:".
 */
const draft = (field_id: string, line: string, extra: Partial<ModelDraft>): ModelDraft => ({
  field_id,
  source_span: line,
  value: null,
  income_amount: null,
  income_period: null,
  income_type: null,
  household_size: null,
  household_parts: [],
  ...extra,
});

const CASES: { name: string; line: string; model: ModelDraft; field: string; value: string; asks: UnclearReason[] }[] = [
  {
    name: "amount only (no period, no gross/net)",
    line: "gano dos mil",
    model: draft("grossIncome", "gano dos mil", { income_amount: 2000, income_period: "UNCLEAR", income_type: "UNCLEAR" }),
    field: "grossIncome",
    value: "2000",
    asks: ["period", "income_type"],
  },
  {
    name: "amount as digits only",
    line: "gano 2000",
    model: draft("grossIncome", "gano 2000", { income_amount: 2000, income_period: "UNCLEAR", income_type: "UNCLEAR" }),
    field: "grossIncome",
    value: "2000",
    asks: ["period", "income_type"],
  },
  {
    name: "approximate amount with no labels",
    line: "gano como dos mil",
    model: draft("grossIncome", "gano como dos mil", { income_amount: 2000, income_period: "UNCLEAR", income_type: "UNCLEAR" }),
    field: "grossIncome",
    value: "2000",
    asks: ["period", "income_type", "approximate"],
  },
  {
    name: "missing period only",
    line: "gano dos mil antes de impuestos",
    model: draft("grossIncome", "gano dos mil antes de impuestos", { income_amount: 2000, income_period: "UNCLEAR", income_type: "gross" }),
    field: "grossIncome",
    value: "2000",
    asks: ["period"],
  },
  {
    name: "missing gross/net only",
    line: "gano dos mil al mes",
    model: draft("grossIncome", "gano dos mil al mes", { income_amount: 2000, income_period: "monthly", income_type: "UNCLEAR" }),
    field: "grossIncome",
    value: "2000/monthly",
    asks: ["income_type"],
  },
  {
    name: "household with no count",
    line: "vivo con mi familia",
    model: draft("householdSize", "vivo con mi familia", { household_size: "UNCLEAR" }),
    field: "householdSize",
    value: "",
    asks: ["household"],
  },
];

describe("an ambiguous value becomes a visible question, never silence", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const drafts = normalizeDrafts([c.model], form, c.line);
      expect(drafts).toHaveLength(1);
      const [d] = drafts;
      expect(d).toMatchObject({ fieldId: c.field, value: c.value, unclear: true, quote: c.line });
      expect(d.ask.trim()).not.toBe("");
      for (const r of c.asks) expect(d.ask).toContain(ASK[r]);

      // …and it lands in the form as a pending value that can't be confirmed.
      let s = sessionReducer(initialSession(form.id), {
        type: "PROPOSE_VALUE",
        fieldId: d.fieldId,
        pending: { value: d.value, origin: "claude", unclear: d.unclear, ask: d.ask, quote: d.quote },
      });
      s = sessionReducer(s, { type: "NEIGHBOR_ANSWER", fieldId: c.field, answer: "yes" });
      const fs = s.fields[c.field];
      expect(fs.pending).toMatchObject({ value: c.value, unclear: true });
      expect(fs.pending!.ask).not.toBe("");
      expect(canConfirm(fs)).toBe(false);
    });
  }
});
