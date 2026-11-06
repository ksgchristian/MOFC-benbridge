"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LANGUAGES } from "@/lib/languages";
import { ui } from "@/lib/i18n/ui";
import { useSession } from "@/lib/session/SessionContext";
import type { Speaker } from "@/lib/session/types";
import { consent } from "@/lib/glossary/consent";
import { getSpeechProvider } from "@/lib/speech";
import { Highlighted, HighlightLegend } from "./Highlighted";
import { MicIcon, MicOffIcon, RedoIcon, SendIcon, StopIcon } from "./Icons";

const noopSubscribe = () => () => {};

type VoiceMode = "idle" | "recording" | "review";

/**
 * Voice + text input for one side. The pane decides the language (navigator
 * en-US, neighbor es-US), so there is no auto-detection. Speech never goes
 * straight to translation: the speaker reviews and edits the transcript,
 * then taps Translate. The typed box stays available as a fallback.
 */
export function Composer({ speaker }: { speaker: Speaker }) {
  const { langFor, sendMessage, state } = useSession();
  // Chosen on the agreement screen. Off = no mic on either side; both people type.
  const voiceOn = state.prefs.voice;
  const lang = langFor(speaker);
  const s = ui(lang);
  const speech = getSpeechProvider();

  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState<VoiceMode>("idle");
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const transcriptRef = useRef("");

  // Client-only checks. Server snapshots are false, so nothing flashes or mismatches on hydration.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const canListen = useSyncExternalStore(noopSubscribe, () => speech.canListen(), () => false);
  useEffect(() => () => stopRef.current?.(), []);

  const startRecording = () => {
    setNotice(null);
    setTranscript("");
    transcriptRef.current = "";
    setMode("recording");
    stopRef.current = speech.listen(LANGUAGES[lang].speechLocale, {
      onResult: (text) => {
        transcriptRef.current = text;
        setTranscript(text);
      },
      onEnd: () => {
        stopRef.current = null;
        if (transcriptRef.current.trim()) {
          setMode("review");
        } else {
          setMode("idle");
          setNotice((prev) => prev ?? s.didntCatch); // keep a real error message if there was one
        }
      },
      onError: (message) => setNotice(message),
    });
  };

  const stopRecording = () => stopRef.current?.();

  const cancelReview = () => {
    setTranscript("");
    transcriptRef.current = "";
    setMode("idle");
  };

  const confirmTranscript = async () => {
    const text = transcript.trim();
    if (!text) return;
    cancelReview();
    await sendMessage(speaker, text);
  };

  const submitTyped = async () => {
    const text = typed;
    setTyped("");
    await sendMessage(speaker, text);
  };

  /* ---- Recording ---- */
  if (mode === "recording") {
    return (
      <div className="flex items-center gap-3" aria-live="polite">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--danger)] opacity-25" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[var(--danger)] text-white">
            <MicIcon size={20} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--danger)]">{s.listening}</p>
          <p lang={lang} className="truncate text-[15px] text-[var(--fg-muted)]">
            {transcript || "…"}
          </p>
        </div>
        <button type="button" onClick={stopRecording} aria-label={s.stop} className="btn btn-gray !h-11 !w-11 !p-0">
          <StopIcon size={18} />
        </button>
      </div>
    );
  }

  /* ---- Review the transcript ---- */
  if (mode === "review") {
    return (
      <div className="space-y-3">
        <p className="text-[13px] font-medium text-[var(--fg-muted)]">{s.checkTranscript}</p>
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            transcriptRef.current = e.target.value;
          }}
          lang={lang}
          rows={2}
          aria-label={s.checkTranscript}
          className="field resize-none"
        />
        {transcript.trim() && (
          <div className="inset-box space-y-2 bg-[var(--fill)]">
            <p lang={lang} className="text-[15px] leading-relaxed">
              <Highlighted text={transcript} lang={lang} />
            </p>
            <HighlightLegend lang={lang} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void confirmTranscript()} disabled={!transcript.trim()} className="btn btn-primary">
            {s.translateBtn}
          </button>
          <button type="button" onClick={startRecording} className="btn btn-gray">
            <RedoIcon size={15} /> {s.reRecord}
          </button>
          <button type="button" onClick={cancelReview} className="btn btn-plain ml-auto">
            {s.cancel}
          </button>
        </div>
      </div>
    );
  }

  /* ---- Idle: mic + typed box ---- */
  const micUnavailable = mounted && !canListen;
  return (
    <div className="space-y-2">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submitTyped();
        }}
      >
        {voiceOn && (
          <button
            type="button"
            onClick={startRecording}
            disabled={!canListen}
            title={micUnavailable ? (speech.id === "none" ? s.voiceOff : s.voiceUnsupported) : s.tapToSpeak}
            aria-label={s.tapToSpeak}
            className="btn btn-primary !h-11 !w-11 shrink-0 !p-0"
          >
            {micUnavailable ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
          </button>
        )}
        <div className="relative min-w-0 flex-1">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={s.typeMessage}
            aria-label={s.orType}
            lang={lang}
            className="field !h-11 !rounded-full !pl-4 !pr-12"
          />
          <button
            type="submit"
            disabled={!typed.trim()}
            aria-label={s.send}
            className="btn btn-primary absolute right-1.5 top-1/2 !h-8 !w-8 -translate-y-1/2 !p-0"
          >
            <SendIcon size={16} />
          </button>
        </div>
      </form>
      {!voiceOn ? (
        <p className="px-1 text-[12px] text-[var(--fg-muted)]">{consent.voiceOffNote[lang === "es" ? "es" : "en"]}</p>
      ) : micUnavailable ? (
        <p className="px-1 text-[12px] text-[var(--fg-muted)]">{speech.id === "none" ? s.voiceOff : s.voiceUnsupported}</p>
      ) : (
        mounted && <p className="px-1 text-[12px] text-[var(--fg-muted)]">{s.tapToSpeak}</p>
      )}
      {notice && <p className="px-1 text-[13px] text-[var(--danger)]">{notice}</p>}
    </div>
  );
}
