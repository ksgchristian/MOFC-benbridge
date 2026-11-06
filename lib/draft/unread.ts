import { numbersInText } from "@/lib/verify/numbers";

/**
 * Catch-all for the "never silent" rule: if a line mentions a number but
 * drafting produced nothing (or failed), the navigator is told so instead of
 * seeing nothing, because silence looks the same as "nothing was said".
 * A false prompt is better than a silent miss.
 *
 * The articles "un"/"una"/"a"/"an" are ignored ("una pregunta" is not a
 * value); "uno"/"one" still count.
 */
const ARTICLES = /(?<![\p{L}])(un|una|a|an)(?![\p{L}])/giu;

export function mentionsNumber(text: string): boolean {
  return numbersInText(text.replace(ARTICLES, " ")).length > 0;
}

/** True when a line that mentions a number produced no draft at all. */
export function valueUnread(text: string, draftCount: number): boolean {
  return draftCount === 0 && mentionsNumber(text);
}
