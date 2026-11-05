import { segment, type RiskKind } from "@/lib/highlight";
import type { LangCode } from "@/lib/languages";

const KIND_CLASS: Record<RiskKind, string> = {
  number: "bg-yellow-200 text-yellow-950 dark:bg-yellow-700/60 dark:text-yellow-50",
  frequency: "bg-sky-200 text-sky-950 dark:bg-sky-700/60 dark:text-sky-50",
  basis: "bg-fuchsia-200 text-fuchsia-950 dark:bg-fuchsia-700/60 dark:text-fuchsia-50",
};

const KIND_TITLE: Record<RiskKind, string> = {
  number: "Number: check it was heard right",
  frequency: "How often: weekly, every two weeks, monthly…",
  basis: "Before or after taxes",
};

/** Renders text with numbers, frequencies and gross/net words marked. */
export function Highlighted({ text, lang }: { text: string; lang: LangCode }) {
  return (
    <>
      {segment(text, lang).map((s, i) =>
        s.kind ? (
          <mark key={i} title={KIND_TITLE[s.kind]} className={`rounded px-0.5 ${KIND_CLASS[s.kind]}`}>
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** Small key explaining the highlight colors. */
export function HighlightLegend({ lang }: { lang: LangCode }) {
  const labels =
    lang === "es"
      ? { number: "número", frequency: "frecuencia", basis: "antes/después de impuestos" }
      : { number: "number", frequency: "how often", basis: "gross / net" };
  return (
    <span className="flex flex-wrap gap-2 text-[11px] text-[var(--fg-muted)]">
      {(Object.keys(labels) as RiskKind[]).map((k) => (
        <span key={k} className={`rounded px-1 ${KIND_CLASS[k]}`}>
          {labels[k]}
        </span>
      ))}
    </span>
  );
}
