import { z } from "zod";
import { LANG_CODES } from "@/lib/languages";

const Lang = z.enum(LANG_CODES as [string, ...string[]]);

/** What kind of text is being translated. Changes tone/brevity in the prompt. */
export const TranslateContext = z.enum(["conversation", "form-label"]);
export type TranslateContext = z.infer<typeof TranslateContext>;

export const TranslateRequest = z.object({
  text: z.string().trim().min(1).max(2000),
  from: Lang,
  to: Lang,
  context: TranslateContext.default("conversation"),
});
export type TranslateRequest = z.infer<typeof TranslateRequest>;

/** Shape Claude must return (structured output). */
export const ModelTranslation = z.object({
  translation: z.string(),
  /** True when the source was ambiguous or a term may not carry over exactly. */
  uncertain: z.boolean(),
  /** Short English note for the navigator explaining the uncertainty; empty if none. */
  uncertainty_note: z.string(),
});
export type ModelTranslation = z.infer<typeof ModelTranslation>;

export const TranslateFormRequest = z.object({
  formId: z.string().min(1).max(100),
  to: Lang,
  /** Map of key → English text to translate. */
  items: z.record(z.string(), z.string().min(1).max(500)),
});
export type TranslateFormRequest = z.infer<typeof TranslateFormRequest>;

export const ModelFormTranslation = z.object({
  items: z.array(z.object({ key: z.string(), translation: z.string() })),
});

/** Server-side result. `uncertain` is the model's own judgment: logged and used by evals, never shown. */
export interface TranslateResponse {
  translation: string;
  uncertain: boolean;
  uncertaintyNote: string;
  glossaryHits: { en: string; translation: string; note?: string }[];
}

/**
 * What the browser gets. The model's self-reported uncertainty is left out on
 * purpose: a warning that doesn't block teaches people to ignore warnings, and
 * its absence would read as "this is fine".
 */
export type ClientTranslateResponse = Omit<TranslateResponse, "uncertain" | "uncertaintyNote">;

export interface ApiError {
  error: "bad_request" | "not_configured" | "rate_limited" | "refused" | "upstream_error";
  message: string;
}
