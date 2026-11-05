"use client";

import { useEffect, useRef } from "react";
import { allFields } from "@/lib/forms/schema";
import { LANGUAGES } from "@/lib/languages";
import { ui } from "@/lib/i18n/ui";
import { useSession } from "@/lib/session/SessionContext";
import type { Message, Speaker } from "@/lib/session/types";
import { getSpeechProvider } from "@/lib/speech";
import { FlagButton } from "./FlagButton";
import { Highlighted } from "./Highlighted";

/**
 * Conversation as seen by `viewer`. Their own lines show what they said plus
 * what the other person sees (transparency). The other person's lines show
 * the translation first, with the original underneath.
 */
export function Transcript({ viewer }: { viewer: Speaker }) {
  const { state, langFor } = useSession();
  const s = ui(langFor(viewer));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [state.messages.length]);

  return (
    <div className="h-64 space-y-2 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--muted)] p-2">
      {state.messages.length === 0 && <p className="p-2 text-sm text-[var(--fg-muted)]">{s.noMessages}</p>}
      {state.messages.map((m) => (
        <MessageRow key={m.id} message={m} viewer={viewer} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function MessageRow({ message: m, viewer }: { message: Message; viewer: Speaker }) {
  const { form, langFor, retryMessage, addFlag } = useSession();
  const viewerLang = langFor(viewer);
  const s = ui(viewerLang);
  const mine = m.speaker === viewer;
  const speech = getSpeechProvider();

  const primary = mine ? m.original.text : m.translated?.text;
  const secondary = mine ? m.translated?.text : m.original.text;
  const secondaryLabel = mine ? s.theySee : s.original;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
          mine ? "bg-[var(--accent-soft)]" : "bg-[var(--surface)]"
        } ${m.uncertain ? "ring-2 ring-amber-400" : ""}`}
      >
        {m.status === "pending" && !mine && <p className="italic text-[var(--fg-muted)]">{s.translating}</p>}
        {primary && (
          <p lang={mine ? m.original.lang : m.translated?.lang}>
            <Highlighted text={primary} lang={mine ? m.original.lang : (m.translated?.lang ?? viewerLang)} />
          </p>
        )}

        {m.status === "pending" && mine && <p className="mt-1 text-xs italic text-[var(--fg-muted)]">{s.translating}</p>}
        {m.status === "done" && secondary && (
          <p className="mt-1 border-t border-[var(--border)] pt-1 text-xs text-[var(--fg-muted)]">
            <span className="font-medium">{secondaryLabel}:</span>{" "}
            <Highlighted text={secondary} lang={mine ? (m.translated?.lang ?? viewerLang) : m.original.lang} />
          </p>
        )}
        {m.status === "error" && (
          <p className="mt-1 text-xs text-red-600">
            {s.translationFailed}: {m.error}{" "}
            <button className="underline" onClick={() => void retryMessage(m.id)}>
              {s.retry}
            </button>
          </p>
        )}

        {m.uncertain && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            ⚠ {s.uncertain}
            {/* The note is written in English for the navigator. */}
            {viewer === "navigator" && m.uncertaintyNote ? `: ${m.uncertaintyNote}` : ""}
          </p>
        )}

        {viewer === "navigator" && m.draftedFields && m.draftedFields.length > 0 && (
          <p className="mt-1 text-xs text-[var(--accent)]">
            ✎ Drafted: {m.draftedFields.map((id) => allFields(form).find((f) => f.id === id)?.label.en ?? id).join(", ")}
          </p>
        )}

        {m.status === "done" && m.translated && (
          <div className="mt-1 flex items-center justify-end gap-1">
            {!mine && speech.canSpeak() && (
              <button
                type="button"
                className="rounded px-1.5 py-0.5 text-xs hover:bg-[var(--muted)]"
                onClick={() => speech.speak(m.translated!.text, LANGUAGES[viewerLang].speechLocale)}
              >
                🔊 {s.listen}
              </button>
            )}
            <FlagButton
              strings={s}
              onFlag={(note) =>
                addFlag(viewer, { kind: "message", messageId: m.id }, m.original.text, m.translated!.text, note)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
