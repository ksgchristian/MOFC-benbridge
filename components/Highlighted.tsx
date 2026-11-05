import { segment, type RiskKind } from "@/lib/highlight";
import type { LangCode } from "@/lib/languages";

const KIND_BG: Record<RiskKind, string> = {
  number: "bg-[var(--mark-number)]",
  frequency: "bg-[var(--mark-frequency)]",
  basis: "bg-[var(--mark-basis)]",
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
          <mark key={i} title={KIND_TITLE[s.kind]} className={`mark ${KIND_BG[s.kind]}`}>
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
    <span className="flex flex-wrap gap-1.5 text-[11px]">
      {(Object.keys(labels) as RiskKind[]).map((k) => (
        <span key={k} className={`mark ${KIND_BG[k]}`}>
          {labels[k]}
        </span>
      ))}
    </span>
  );
}
