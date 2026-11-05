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
import { AlertIcon, SparkleIcon, SpeakerIcon } from "./Icons";

/**
 * Conversation as seen by `viewer`. Their own lines (right, green) show what
 * they said plus what the other person sees. The other person's lines (left,
 * gray) show the translation first, with the original underneath.
 */
export function Transcript({ viewer }: { viewer: Speaker }) {
  const { state, langFor } = useSession();
  const s = ui(langFor(viewer));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [state.messages]);

  return (
    <div ref={scrollRef} className="h-80 space-y-3 overflow-y-auto px-4 py-4">
      {state.messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-center text-[15px] text-[var(--fg-muted)]">{s.noMessages}</div>
      ) : (
        state.messages.map((m) => <MessageRow key={m.id} message={m} viewer={viewer} />)
      )}
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
  const primaryLang = mine ? m.original.lang : (m.translated?.lang ?? viewerLang);
  const secondary = mine ? m.translated?.text : m.original.text;
  const secondaryLang = mine ? (m.translated?.lang ?? viewerLang) : m.original.lang;
  const secondaryLabel = mine ? s.theySee : s.original;

  return (
    <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-[20px] px-4 py-2.5 text-[15px] leading-snug ${
          mine ? "rounded-br-md bg-[var(--accent)] text-[var(--on-accent)]" : "rounded-bl-md bg-[var(--bubble-them)] text-[var(--fg)]"
        } ${m.uncertain ? "ring-2 ring-[var(--warn)] ring-offset-2 ring-offset-[var(--surface)]" : ""}`}
      >
        {primary ? (
          <p lang={primaryLang}>
            <Highlighted text={primary} lang={primaryLang} />
          </p>
        ) : (
          m.status === "pending" && <TypingDots />
        )}

        {m.status === "done" && secondary && (
          <p className="mt-1.5 border-t border-current/20 pt-1.5 text-[13px] opacity-80">
            <span className="font-medium">{secondaryLabel}:</span> <Highlighted text={secondary} lang={secondaryLang} />
          </p>
        )}
        {m.status === "pending" && mine && <p className="mt-1 text-[13px] opacity-70">{s.translating}</p>}
      </div>

      {m.status === "error" && (
        <p className="flex items-center gap-1 px-2 text-[13px] text-[var(--danger)]">
          {s.translationFailed}. {m.error}
          <button className="btn-plain btn btn-sm !h-6 !px-2" onClick={() => void retryMessage(m.id)}>
            {s.retry}
          </button>
        </p>
      )}

      {m.uncertain && (
        <p className="flex max-w-[85%] items-start gap-1.5 px-2 text-[13px] text-[var(--warn)]">
          <AlertIcon size={14} className="mt-0.5 shrink-0" />
          <span>
            {s.uncertain}
            {/* The note is written in English for the navigator. */}
            {viewer === "navigator" && m.uncertaintyNote ? `: ${m.uncertaintyNote}` : ""}
          </span>
        </p>
      )}

      <div className="flex items-center gap-1 px-1">
        {viewer === "navigator" && m.draftedFields && m.draftedFields.length > 0 && (
          <span className="chip bg-[var(--accent-soft)] text-[var(--accent)]">
            <SparkleIcon size={12} />
            {m.draftedFields.map((id) => allFields(form).find((f) => f.id === id)?.label.en ?? id).join(", ")}
          </span>
        )}
        {m.status === "done" && m.translated && (
          <>
            {!mine && speech.canSpeak() && (
              <button
                type="button"
                title={s.listen}
                aria-label={s.listen}
                className="icon-btn"
                onClick={() => speech.speak(m.translated!.text, LANGUAGES[viewerLang].speechLocale)}
              >
                <SpeakerIcon size={15} />
              </button>
            )}
            <FlagButton
              strings={s}
              onFlag={(note) => addFlag(viewer, { kind: "message", messageId: m.id }, m.original.text, m.translated!.text, note)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex h-5 items-center gap-1" aria-label="Translating">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-current opacity-50" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}
