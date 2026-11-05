"use client";

import type { LangCode } from "@/lib/languages";
import { postJson } from "@/lib/translate/client";
import type { Speaker } from "@/lib/session/types";
import type { FieldDraft } from "./schema";

export function requestDrafts(
  formId: string,
  speaker: Speaker,
  lang: LangCode,
  text: string,
  context: { speaker: Speaker; text: string }[],
) {
  return postJson<{ drafts: FieldDraft[] }>("/api/draft", { formId, speaker, lang, text, context });
}
