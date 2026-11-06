import raw from "./consent.json";

/** One piece of agreement-screen text, in both languages. `reviewed` = approved by MOFC. */
export interface ConsentText {
  es: string;
  en: string;
  reviewed: boolean;
}

type Raw = typeof raw;
type TextKey = Exclude<keyof Raw, "_note" | "always">;

/** All text for the privacy and agreement screen. Edit lib/glossary/consent.json, not this file. */
export const consent = raw as unknown as Record<TextKey, ConsentText> & { always: ConsentText[] };

export type ConsentKey = TextKey;

/** Every entry, for checks (tests, "draft wording" reporting). */
export function allConsentTexts(): ConsentText[] {
  const { _note: _ignored, always, ...rest } = raw as unknown as Record<string, unknown> & { always: ConsentText[] };
  void _ignored;
  return [...(Object.values(rest) as ConsentText[]), ...always];
}
