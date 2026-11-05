"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LANGUAGES } from "@/lib/languages";
import { ui } from "@/lib/i18n/ui";
import { useSession } from "@/lib/session/SessionContext";
import type { Speaker } from "@/lib/session/types";
import { getSpeechProvider } from "@/lib/speech";
import { Highlighted, HighlightLegend } from "./Highlighted";

const noopSubscribe = () => () => {};

type VoiceMode = "idle" | "recording" | "review";

/**
 * Voice + text input for one side. The pane decides the language (navigator
 * en-US, neighbor es-US), so there is no auto-detection. Speech never goes
 * straight to translation: the speaker reviews and edits the transcript,
 * then taps Translate. The typed box stays available as a fallback.
 */
export function Composer({ speaker }: { speaker: Speaker }) {
  const { langFor, sendMessage } = useSession();
  const lang = langFor(speaker);
  const s = ui(lang);
  const speech = getSpeechProvider();

  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState<VoiceMode>("idle");
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const transcriptRef = useRef("");

  // Client-only feature detection (server snapshot = false, so no hydration mismatch).
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

  const voiceUnavailableMessage = speech.id === "none" ? s.voiceOff : s.voiceUnsupported;

  return (
    <div className="space-y-2">
      {/* Voice */}
      {!canListen ? (
        <p role="status" className="rounded-md bg-[var(--muted)] px-3 py-2 text-xs text-[var(--fg-muted)]">
          🎤 {voiceUnavailableMessage}
        </p>
      ) : mode === "idle" ? (
        <button
          type="button"
          onClick={startRecording}
          className="w-full rounded-md border-2 border-dashed border-[var(--accent)] px-3 py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          🎤 {s.tapToSpeak}
        </button>
      ) : mode === "recording" ? (
        <div className="space-y-2 rounded-md border-2 border-red-500 p-3" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-red-600">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden />
              {s.listening}
            </span>
            <button type="button" onClick={stopRecording} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white">
              ■ {s.stop}
            </button>
          </div>
          <p lang={lang} className="min-h-6 text-sm text-[var(--fg-muted)]">
            {transcript || "…"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border-2 border-[var(--accent)] p-3">
          <p className="text-xs font-medium">{s.checkTranscript}</p>
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              transcriptRef.current = e.target.value;
            }}
            lang={lang}
            rows={3}
            aria-label={s.checkTranscript}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          {transcript.trim() && (
            <div className="space-y-1 rounded-md bg-[var(--muted)] px-3 py-2">
              <p lang={lang} className="text-sm leading-relaxed">
                <Highlighted text={transcript} lang={lang} />
              </p>
              <HighlightLegend lang={lang} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void confirmTranscript()}
              disabled={!transcript.trim()}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {s.translateBtn}
            </button>
            <button type="button" onClick={startRecording} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]">
              🎤 {s.reRecord}
            </button>
            <button type="button" onClick={cancelReview} className="rounded-md px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--muted)]">
              {s.cancel}
            </button>
          </div>
        </div>
      )}
      {notice && <p className="text-xs text-red-600">{notice}</p>}

      {/* Typed fallback */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submitTyped();
        }}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={s.typeMessage}
          aria-label={s.orType}
          lang={lang}
          disabled={mode === "recording"}
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!typed.trim()}
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {s.send}
        </button>
      </form>
    </div>
  );
}
