import { z } from "zod";
import { LANG_CODES } from "@/lib/languages";

/**
 * Strict extraction schema (guardrail 1). Every money field carries its
 * qualifiers, and "UNCLEAR" is a valid, expected value, not an error.
 * There is deliberately NO model-reported confidence field: whether a draft
 * is unclear is decided in code (lib/draft/normalize.ts).
 */
export const IncomePeriod = z.enum(["monthly", "weekly", "biweekly", "semimonthly", "annual", "UNCLEAR"]);
export type IncomePeriod = z.infer<typeof IncomePeriod>;
export const IncomeType = z.enum(["gross", "net", "UNCLEAR"]);
export type IncomeType = z.infer<typeof IncomeType>;

export const HouseholdPart = z.object({ count: z.number().int(), label: z.string() });

/** What Claude returns. Every key is always present; fields that don't apply are null / []. */
export const ModelDraft = z.object({
  field_id: z.string(),
  /** Exact words from the new line this draft comes from (checked in code). */
  source_span: z.string(),
  /** Non-money, non-household fields: the value in the field's format. null otherwise. */
  value: z.string().nullable(),
  /** Money fields: the number as said, never converted. null if no amount was said ("no trabajo ahora"). */
  income_amount: z.number().nullable(),
  /** Money fields: never omitted. UNCLEAR if how often wasn't said. null only for non-money fields. */
  income_period: IncomePeriod.nullable(),
  /** Money fields: never omitted. UNCLEAR if before/after taxes wasn't said. null for non-money fields. */
  income_type: IncomeType.nullable(),
  /** Household size: the total as said, or UNCLEAR. null for other fields. */
  household_size: z.union([z.number().int(), z.literal("UNCLEAR")]).nullable(),
  /** Household size given in parts ("3 adultos y 2 niños"). [] if a single number was said. */
  household_parts: z.array(HouseholdPart),
});
export type ModelDraft = z.infer<typeof ModelDraft>;

export const ModelDrafts = z.object({ drafts: z.array(ModelDraft) });

const ContextLine = z.object({
  speaker: z.enum(["neighbor", "navigator"]),
  text: z.string().max(2000),
});

export const DraftRequest = z.object({
  formId: z.string().min(1).max(100),
  speaker: z.enum(["neighbor", "navigator"]),
  lang: z.enum(LANG_CODES as [string, ...string[]]),
  text: z.string().trim().min(1).max(2000),
  /** A few earlier lines (original language) so short answers like "tres" can be placed. */
  context: z.array(ContextLine).max(6).default([]),
});
export type DraftRequest = z.infer<typeof DraftRequest>;

/** Why a draft can't be confirmed yet. Decided in code, never by the model. */
export type UnclearReason =
  | "period"
  | "quincena"
  | "income_type"
  | "approximate"
  | "no_amount"
  | "household"
  | "household_math"
  | "number"
  | "date"
  | "no_source"
  | "number_unverified";

/** A draft after the code checks, ready to propose into the form. */
export interface FieldDraft {
  fieldId: string;
  /** Form value ("2100/monthly", "5", "yes"…). Empty when there's nothing safe to show. */
  value: string;
  unclear: boolean;
  /** The question for the navigator to ask, when unclear. */
  ask: string;
  reason?: UnclearReason;
  /** Arithmetic shown to people, e.g. "3 adults + 2 children = 5". Done in code. */
  math?: string;
  /** Guardrail 2: the exact words from the transcript this came from (verified in code). "" if none. */
  quote: string;
}

/** Runtime check of the /api/draft response shape (evals fail loudly if this changes). */
export const FieldDraftShape = z.object({
  fieldId: z.string(),
  value: z.string(),
  unclear: z.boolean(),
  ask: z.string(),
  reason: z.string().optional(),
  math: z.string().optional(),
  quote: z.string(),
});
