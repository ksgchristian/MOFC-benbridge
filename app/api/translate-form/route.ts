import { translateFormLabels, TranslateError } from "@/lib/translate/claude";
import { TranslateFormRequest, type ApiError } from "@/lib/translate/schema";
import type { LangCode } from "@/lib/languages";

/**
 * POST {formId, to, items: {key: englishText}} → {items: {key: translation}}
 *
 * Only for form labels/help text (never neighbor data). Results are cached in
 * server memory per form + language + text, so each label is translated once
 * per server process.
 */
const cache = new Map<string, string>();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request", message: "Body must be JSON." } satisfies ApiError, { status: 400 });
  }
  const parsed = TranslateFormRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "bad_request", message: "Invalid form translate request." } satisfies ApiError, { status: 400 });
  }

  const { formId, to, items } = parsed.data;
  const keyFor = (k: string) => `${formId}|${to}|${k}|${items[k]}`;

  const result: Record<string, string> = {};
  const missing: Record<string, string> = {};
  for (const k of Object.keys(items)) {
    const hit = cache.get(keyFor(k));
    if (hit !== undefined) result[k] = hit;
    else missing[k] = items[k];
  }

  if (Object.keys(missing).length > 0) {
    try {
      const translated = await translateFormLabels(missing, to as LangCode);
      for (const [k, v] of Object.entries(translated)) {
        cache.set(keyFor(k), v);
        result[k] = v;
      }
    } catch (err) {
      if (err instanceof TranslateError) {
        return Response.json({ error: err.code, message: err.message } satisfies ApiError, { status: err.status });
      }
      return Response.json({ error: "upstream_error", message: "Unexpected error." } satisfies ApiError, { status: 500 });
    }
  }

  return Response.json({ items: result });
}
