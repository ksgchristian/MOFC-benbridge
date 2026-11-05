import { draftFields } from "@/lib/draft/claude";
import { DraftRequest } from "@/lib/draft/schema";
import { getForm } from "@/lib/forms";
import { TranslateError } from "@/lib/translate/claude";
import type { ApiError } from "@/lib/translate/schema";

/** POST {formId, speaker, lang, text, context?} → {drafts: FieldDraft[]} */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request", message: "Body must be JSON." } satisfies ApiError, { status: 400 });
  }
  const parsed = DraftRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "bad_request", message: "Invalid draft request." } satisfies ApiError, { status: 400 });
  }
  const form = getForm(parsed.data.formId);
  if (!form) {
    return Response.json({ error: "bad_request", message: "Unknown form." } satisfies ApiError, { status: 400 });
  }
  try {
    return Response.json({ drafts: await draftFields(form, parsed.data) });
  } catch (err) {
    if (err instanceof TranslateError) {
      return Response.json({ error: err.code, message: err.message } satisfies ApiError, { status: err.status });
    }
    return Response.json({ error: "upstream_error", message: "Unexpected error." } satisfies ApiError, { status: 500 });
  }
}
