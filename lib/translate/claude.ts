/**
 * Server-only Claude calls. Import this only from app/api/** route handlers
 * (or scripts), never from client components, so the API key stays on the server.
 *
 * Privacy: never log `text` or translations. Neighbor speech can contain PII.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { LangCode } from "@/lib/languages";
import { findGlossaryHits } from "@/lib/glossary";
import {
  buildFormSystemPrompt,
  buildFormUserMessage,
  buildSystemPrompt,
  buildUserMessage,
} from "./prompt";
import {
  ModelFormTranslation,
  ModelTranslation,
  type ApiError,
  type TranslateContext,
  type TranslateResponse,
} from "./schema";

/** Override with ANTHROPIC_MODEL (e.g. claude-haiku-5-5 for lower latency/cost). */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
/** Translation is a simple task; low effort keeps latency down. */
const EFFORT = (process.env.ANTHROPIC_EFFORT || "low") as "low" | "medium" | "high";

/** Server-side refusal fallback, routed by the API. Not supported on Haiku. */
const USE_FALLBACKS = !MODEL.includes("haiku");

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export class TranslateError extends Error {
  constructor(
    public readonly code: ApiError["error"],
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function callClaude<S extends z.ZodType>(system: string, user: string, schema: S): Promise<z.infer<S>> {
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      ...(USE_FALLBACKS
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      output_config: { effort: EFFORT, format: betaZodOutputFormat(schema) },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });

    if (response.stop_reason === "refusal") {
      throw new TranslateError("refused", "The translation was declined. Use the phone interpreter for this line.", 422);
    }
    if (!response.parsed_output) {
      throw new TranslateError("upstream_error", "The translation came back in an unexpected format.", 502);
    }
    return response.parsed_output as z.infer<S>;
  } catch (err) {
    if (err instanceof TranslateError) throw err;
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new TranslateError("not_configured", "Claude API credentials are missing or invalid. Set ANTHROPIC_API_KEY in .env.local.", 503);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new TranslateError("rate_limited", "Too many requests. Try again in a moment.", 429);
    }
    if (err instanceof Anthropic.APIError) {
      // Log status/type only. Never the request body.
      console.error(`[translate] Claude API error status=${err.status}`);
      throw new TranslateError("upstream_error", "The translation service had a problem. Try again.", 502);
    }
    if (err instanceof Error && /api key|apiKey|authentication/i.test(err.message)) {
      throw new TranslateError("not_configured", "Claude API credentials are missing. Set ANTHROPIC_API_KEY in .env.local.", 503);
    }
    console.error("[translate] unexpected error", err instanceof Error ? err.name : typeof err);
    throw new TranslateError("upstream_error", "Unexpected translation error.", 500);
  }
}

export async function translateText(
  text: string,
  from: LangCode,
  to: LangCode,
  context: TranslateContext,
): Promise<TranslateResponse> {
  const glossaryHits = findGlossaryHits(text, from, to);
  if (from === to) {
    return { translation: text, uncertain: false, uncertaintyNote: "", glossaryHits };
  }
  const out = await callClaude(buildSystemPrompt(from, to), buildUserMessage(text, context), ModelTranslation);
  return {
    translation: out.translation,
    uncertain: out.uncertain,
    uncertaintyNote: out.uncertainty_note,
    glossaryHits,
  };
}

export async function translateFormLabels(
  items: Record<string, string>,
  to: LangCode,
): Promise<Record<string, string>> {
  if (to === "en") return items;
  const out = await callClaude(buildFormSystemPrompt(to), buildFormUserMessage(items), ModelFormTranslation);
  const result: Record<string, string> = {};
  for (const { key, translation } of out.items) {
    if (key in items) result[key] = translation;
  }
  return result;
}
