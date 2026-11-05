import { z } from "zod";
import { LANG_CODES } from "@/lib/languages";

export const Period = z.enum(["weekly", "biweekly", "semimonthly", "monthly", "yearly", "unclear", "not_applicable"]);
export type Period = z.infer<typeof Period>;
export const Basis = z.enum(["gross", "net", "unclear", "not_applicable"]);
export type Basis = z.infer<typeof Basis>;

/** What Claude returns (structured output). Every field is required; unused ones get null / "not_applicable". */
export const ModelDraft = z.object({
  field_id: z.string(),
  /** Value for non-money fields, in the field's format. "" for money fields. */
  value: z.string(),
  /** Money fields only: the amount exactly as stated, NOT converted. */
  amount: z.number().nullable(),
  period: Period,
  basis: Basis,
  unclear: z.boolean(),
  /** Short English question the navigator should ask, when unclear. */
  ask_navigator: z.string(),
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

/** A draft after normalizing, ready to propose into the form. */
export interface FieldDraft {
  fieldId: string;
  value: string;
  unclear: boolean;
  ask: string;
}
