"use client";

import type { LangCode } from "@/lib/languages";
import type { ApiError, TranslateContext, TranslateResponse } from "./schema";

export class ClientTranslateError extends Error {
  constructor(public readonly code: ApiError["error"] | "network", message: string) {
    super(message);
  }
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ClientTranslateError("network", "Could not reach the server.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data as ApiError | null;
    throw new ClientTranslateError(err?.error ?? "upstream_error", err?.message ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

export function translate(text: string, from: LangCode, to: LangCode, context: TranslateContext = "conversation") {
  return postJson<TranslateResponse>("/api/translate", { text, from, to, context });
}

export function translateFormItems(formId: string, to: LangCode, items: Record<string, string>) {
  return postJson<{ items: Record<string, string> }>("/api/translate-form", { formId, to, items });
}
