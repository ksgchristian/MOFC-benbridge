import { readFileSync } from "node:fs";
import { join } from "node:path";
import { allFields, type FormField, type FormSchema } from "@/lib/forms/schema";
import { LANGUAGES, type LangCode } from "@/lib/languages";
import { allQualifierEntries } from "@/lib/verify/qualifiers";
import type { DraftRequest } from "./schema";

/**
 * The extraction prompt lives in prompts/extraction.md so changes are easy to
 * diff. Server-only: read once from disk. {{FIELDS}} is filled from the form.
 */
let template: string | null = null;
function extractionTemplate(): string {
  template ??= readFileSync(join(process.cwd(), "prompts", "extraction.md"), "utf8");
  return template;
}

function describeField(f: FormField): string {
  const base = `- ${f.id} (${f.label.en})`;
  switch (f.type) {
    case "select":
      return `${base}: value is one of ${f.options.map((o) => o.value).join(", ")}`;
    case "yesno":
      return `${base}: value is "yes" or "no"`;
    case "number":
      return f.allowParts
        ? `${base}: household size. Use household_size and household_parts; value null`
        : `${base}: value is digits only`;
    case "date":
      return `${base}: value is YYYY-MM-DD`;
    case "money":
      return f.basis
        ? `${base}: income field (${f.basis}). Use income_amount, income_period, income_type; value null`
        : `${base}: money field, not income. Use income_amount and income_period; income_type null; value null`;
    default:
      return `${base}: value exactly as said`;
  }
}

/** The same marker words the code checks against (lib/glossary/qualifiers.json): one list. */
function qualifierMarkersForPrompt(): string {
  return allQualifierEntries()
    .map(({ kind, value, entry }) => `  - ${kind} = ${value}: ${[...entry.es, ...entry.en].map((w) => `"${w}"`).join(", ")}`)
    .join("\n");
}

/** Stable per form (cacheable): depends only on the form, never on the message. */
export function buildDraftSystemPrompt(form: FormSchema): string {
  return extractionTemplate()
    .replace("{{FIELDS}}", allFields(form).map(describeField).join("\n"))
    .replace("{{QUALIFIER_MARKERS}}", qualifierMarkersForPrompt());
}

export function buildDraftUserMessage(req: Pick<DraftRequest, "speaker" | "lang" | "text" | "context">): string {
  const ctx = req.context.length
    ? `<context>\n${req.context.map((c) => `${c.speaker}: ${c.text}`).join("\n")}\n</context>\n`
    : "";
  return `${ctx}New line from the ${req.speaker}, in ${LANGUAGES[req.lang as LangCode].name}:\n<line>\n${req.text}\n</line>`;
}
