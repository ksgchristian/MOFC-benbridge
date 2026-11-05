/**
 * Server-only: drafts form values from one conversation line.
 * Import only from app/api/** and tests/*.eval.ts. Never log `text`.
 */
import type { FormSchema } from "@/lib/forms/schema";
import { callClaude } from "@/lib/translate/claude";
import { normalizeDrafts } from "./normalize";
import { buildDraftSystemPrompt, buildDraftUserMessage } from "./prompt";
import { ModelDrafts, type DraftRequest, type FieldDraft } from "./schema";

export async function draftFields(
  form: FormSchema,
  req: Pick<DraftRequest, "speaker" | "lang" | "text" | "context">,
): Promise<FieldDraft[]> {
  const out = await callClaude(buildDraftSystemPrompt(form), buildDraftUserMessage(req), ModelDrafts);
  return normalizeDrafts(out.drafts, form);
}
