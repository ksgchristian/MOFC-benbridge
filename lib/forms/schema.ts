import type { LangCode } from "@/lib/languages";

/**
 * Text shown on a form. `en` is required; other languages are optional
 * staff-approved translations. Missing ones are machine-translated at runtime
 * (see useFormLabels), and approved text always wins.
 */
export type LocalizedText = { en: string } & Partial<Record<LangCode, string>>;

export interface SelectOption {
  value: string;
  label: LocalizedText;
}

interface BaseField {
  id: string;
  label: LocalizedText;
  help?: LocalizedText;
  required?: boolean;
}

/**
 * Field values are NEVER sent to Claude. Free text (names, addresses) is
 * shown as typed; select/yes-no values show their localized option label.
 */
export type FormField =
  | (BaseField & { type: "text" | "date" | "phone" })
  | (BaseField & { type: "number" })
  | (BaseField & { type: "money" })
  | (BaseField & { type: "yesno" })
  | (BaseField & { type: "select"; options: SelectOption[] });

export interface FormSection {
  id: string;
  title: LocalizedText;
  fields: FormField[];
}

export interface FormSchema {
  id: string;
  title: LocalizedText;
  /** Shown to everyone: this is a mock, not a real government form. */
  disclaimer: LocalizedText;
  sections: FormSection[];
}

export function allFields(form: FormSchema): FormField[] {
  return form.sections.flatMap((s) => s.fields);
}

export const YES_NO_LABELS: Record<"yes" | "no", LocalizedText> = {
  yes: { en: "Yes", es: "Sí" },
  no: { en: "No", es: "No" },
};
