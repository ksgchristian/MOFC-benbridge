import type { LangCode } from "@/lib/languages";
import { formatMoney, parseMoney } from "./money";
import { YES_NO_LABELS, type FormField, type LocalizedText } from "./schema";

/**
 * How a field value appears in the given language. Values are never machine
 * translated: free text shows as typed; choices show their localized label.
 */
export function displayValue(
  field: FormField,
  value: string,
  lang: LangCode,
  t: (key: string, text: LocalizedText | undefined) => string,
): string {
  if (value.trim() === "") return "";
  switch (field.type) {
    case "yesno":
      return value === "yes" || value === "no" ? t(`yesno.${value}`, YES_NO_LABELS[value]) : value;
    case "select": {
      const opt = field.options.find((o) => o.value === value);
      return opt ? t(`field.${field.id}.option.${opt.value}`, opt.label) : value;
    }
    case "money": {
      const money = parseMoney(value);
      return money ? formatMoney(money, lang) : value;
    }
    case "date": {
      const d = new Date(`${value}T00:00:00`);
      return Number.isNaN(d.getTime())
        ? value
        : new Intl.DateTimeFormat(lang === "en" ? "en-US" : `${lang}-US`, { dateStyle: "long" }).format(d);
    }
    default:
      return value;
  }
}
