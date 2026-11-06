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
  | (BaseField & {
      type: "number";
      /** The speaker may give the total as parts ("3 adults and 2 children"); code adds them up. */
      allowParts?: boolean;
    })
  | (BaseField & {
      /** Stored as stated: amount + how often (see lib/forms/money.ts). Never converted. */
      type: "money";
      /** Income fields only: before taxes (gross) or after (net). Required to be stated. */
      basis?: "gross" | "net";
    })
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
