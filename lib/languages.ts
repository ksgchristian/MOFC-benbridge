/**
 * Supported languages. To add one:
 *   1. Add an entry here.
 *   2. Add lib/glossary/<code>.json (can start empty: []).
 *   3. Add UI strings in lib/i18n/ui.ts.
 *   4. Optionally add hand-approved form labels in the form definition;
 *      anything missing is machine-translated via /api/translate-form.
 */
export const LANGUAGES = {
  en: { code: "en", name: "English", nativeName: "English", speechLocale: "en-US" },
  es: { code: "es", name: "Spanish", nativeName: "Español", speechLocale: "es-US" },
} as const;

export type LangCode = keyof typeof LANGUAGES;

export const LANG_CODES = Object.keys(LANGUAGES) as LangCode[];

/** Navigators always work in English. */
export const NAVIGATOR_LANG: LangCode = "en";

/** Default language for the neighbor pane. */
export const DEFAULT_NEIGHBOR_LANG: LangCode = "es";

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === "string" && value in LANGUAGES;
}
