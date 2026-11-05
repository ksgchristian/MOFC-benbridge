import type { LangCode } from "@/lib/languages";
import es from "./es.json";

/**
 * Staff-approved benefit terms. Each entry maps an English term to its
 * approved translation. Flags exported from the app are reviewed by staff
 * and turned into new entries here.
 */
export interface GlossaryEntry {
  en: string;
  /** Approved translation in the target language. */
  [lang: string]: string | undefined;
  note?: string;
}

const GLOSSARIES: Partial<Record<LangCode, GlossaryEntry[]>> = {
  es: es as GlossaryEntry[],
};

/** Glossary for a non-English language (English has none). */
export function getGlossary(lang: LangCode): GlossaryEntry[] {
  return GLOSSARIES[lang] ?? [];
}

export interface GlossaryHit {
  en: string;
  translation: string;
  note?: string;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text: string, term: string): boolean {
  // Whole-word, case-insensitive. \b is ASCII-only, so use Unicode-aware boundaries.
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}($|[^\\p{L}\\p{N}])`, "iu");
  return re.test(text);
}

/**
 * Find glossary terms that appear in `text`, which is written in `from`.
 * Returns the approved pair for the non-English side of the translation.
 */
export function findGlossaryHits(text: string, from: LangCode, to: LangCode): GlossaryHit[] {
  const other = from === "en" ? to : from;
  if (other === "en") return [];
  const hits: GlossaryHit[] = [];
  for (const entry of getGlossary(other)) {
    const translation = entry[other];
    if (!translation) continue;
    const source = from === "en" ? entry.en : translation;
    if (containsTerm(text, source)) {
      hits.push({ en: entry.en, translation, note: entry.note });
    }
  }
  return hits;
}

/** Render the glossary as lines for the system prompt. Stable order → cache-friendly. */
export function formatGlossaryForPrompt(lang: LangCode): string {
  return getGlossary(lang)
    .filter((e) => e[lang])
    .map((e) => `- "${e.en}" = "${e[lang]}"${e.note ? ` (${e.note})` : ""}`)
    .join("\n");
}
