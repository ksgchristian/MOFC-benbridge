"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LANGUAGES } from "@/lib/languages";
import { ui } from "@/lib/i18n/ui";
import { useSession } from "@/lib/session/SessionContext";
import type { Speaker } from "@/lib/session/types";
import { getSpeechProvider } from "@/lib/speech";

const noopSubscribe = () => () => {};

/**
 * Text box + mic. Speech fills the box instead of sending right away, so the
 * speaker can check what was heard before it's translated.
 */
export function Composer({ speaker }: { speaker: Speaker }) {
  const { langFor, sendMessage } = useSession();
  const lang = langFor(speaker);
  const s = ui(lang);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const speech = getSpeechProvider();

  // Feature-detect on the client only (server snapshot = false, so no hydration mismatch).
  const canListen = useSyncExternalStore(noopSubscribe, () => speech.canListen(), () => false);
  useEffect(() => () => stopRef.current?.(), []);

  const submit = async () => {
    const value = text;
    setText("");
    await sendMessage(speaker, value);
  };

  const toggleMic = () => {
    if (listening) {
      stopRef.current?.();
      return;
    }
    setVoiceError(null);
    setListening(true);
    stopRef.current = speech.listen(LANGUAGES[lang].speechLocale, {
      onResult: (t) => setText(t),
      onEnd: () => {
        setListening(false);
        stopRef.current = null;
      },
      onError: (m) => setVoiceError(m),
    });
  };

  return (
    <div className="space-y-1">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={s.typeMessage}
          lang={lang}
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        {canListen && (
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={listening}
            className={`rounded-md border border-[var(--border)] px-3 py-2 text-sm ${listening ? "bg-red-600 text-white" : "hover:bg-[var(--muted)]"}`}
          >
            {listening ? `■ ${s.stop}` : `🎤 ${s.speak}`}
          </button>
        )}
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {s.send}
        </button>
      </form>
      {voiceError && <p className="text-xs text-red-600">{voiceError}</p>}
    </div>
  );
}
