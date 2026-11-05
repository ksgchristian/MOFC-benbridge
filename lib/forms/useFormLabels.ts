"use client";

import { useEffect, useMemo, useState } from "react";
import type { LangCode } from "@/lib/languages";
import { translateFormItems } from "@/lib/translate/client";
import { YES_NO_LABELS, type FormSchema, type LocalizedText } from "./schema";

/** Collect every label in a form that has no approved translation for `lang`. */
export function collectMissingLabels(form: FormSchema, lang: LangCode): Record<string, string> {
  const missing: Record<string, string> = {};
  const add = (key: string, t?: LocalizedText) => {
    if (t && !t[lang]) missing[key] = t.en;
  };
  add("title", form.title);
  add("disclaimer", form.disclaimer);
  add("yesno.yes", YES_NO_LABELS.yes);
  add("yesno.no", YES_NO_LABELS.no);
  for (const s of form.sections) {
    add(`section.${s.id}`, s.title);
    for (const f of s.fields) {
      add(`field.${f.id}.label`, f.label);
      add(`field.${f.id}.help`, f.help);
      if (f.type === "select") for (const o of f.options) add(`field.${f.id}.option.${o.value}`, o.label);
    }
  }
  return missing;
}

export interface FormLabels {
  /** Get text for `key` in the pane's language: approved → machine → English. */
  t: (key: string, text: LocalizedText | undefined) => string;
  /** True if `key` is shown via machine translation (not staff-approved). */
  isMachine: (key: string) => boolean;
  loading: boolean;
  error: string | null;
}

export function useFormLabels(form: FormSchema, lang: LangCode): FormLabels {
  const missing = useMemo(() => collectMissingLabels(form, lang), [form, lang]);
  const missingKey = JSON.stringify(missing);
  const needsFetch = Object.keys(missing).length > 0;

  const [result, setResult] = useState<{ forKey: string; items: Record<string, string>; error: string | null } | null>(null);

  useEffect(() => {
    if (!needsFetch) return;
    let cancelled = false;
    translateFormItems(form.id, lang, missing)
      .then((r) => !cancelled && setResult({ forKey: missingKey, items: r.items, error: null }))
      .catch((e: Error) => !cancelled && setResult({ forKey: missingKey, items: {}, error: e.message }));
    return () => {
      cancelled = true;
    };
    // missingKey captures `missing` by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id, lang, missingKey, needsFetch]);

  const current = result?.forKey === missingKey ? result : null;
  const machine = current?.items ?? {};

  return {
    t: (key, text) => (text ? text[lang] ?? machine[key] ?? text.en : ""),
    isMachine: (key) => key in machine,
    loading: needsFetch && !current,
    error: current?.error ?? null,
  };
}
