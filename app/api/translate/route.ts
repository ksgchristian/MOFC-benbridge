import { translateText, TranslateError } from "@/lib/translate/claude";
import { TranslateRequest, type ApiError } from "@/lib/translate/schema";
import type { LangCode } from "@/lib/languages";

/** POST {text, from, to, context?} → TranslateResponse */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request", message: "Body must be JSON." } satisfies ApiError, { status: 400 });
  }

  const parsed = TranslateRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "bad_request", message: "Invalid translate request." } satisfies ApiError, { status: 400 });
  }

  const { text, from, to, context } = parsed.data;
  try {
    const result = await translateText(text, from as LangCode, to as LangCode, context);
    return Response.json(result);
  } catch (err) {
    if (err instanceof TranslateError) {
      return Response.json({ error: err.code, message: err.message } satisfies ApiError, { status: err.status });
    }
    return Response.json({ error: "upstream_error", message: "Unexpected error." } satisfies ApiError, { status: 500 });
  }
}
