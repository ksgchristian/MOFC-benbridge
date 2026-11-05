import type { SpeechProvider } from "./types";

/**
 * Browser Web Speech API.
 * PRIVACY: in Chrome, speech recognition audio is sent to Google's servers.
 * Fine for sample data; needs MOFC review before use with real neighbors.
 */

// Minimal typings. The Web Speech API isn't in TypeScript's DOM lib.
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const webSpeech: SpeechProvider = {
  id: "web",
  privacyNote: "Voice uses your browser's speech service (Chrome sends audio to Google). Use sample data only.",

  canListen: () => getRecognitionCtor() !== null,
  canSpeak: () => typeof window !== "undefined" && "speechSynthesis" in window,

  listen(locale, { onResult, onEnd, onError }) {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onError("This browser does not support voice input. Try Chrome, or type instead.");
      onEnd();
      return () => {};
    }
    const rec = new Ctor();
    rec.lang = locale;
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e) => {
      let text = "";
      let isFinal = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) isFinal = true;
      }
      onResult(text, isFinal);
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") onError(`Voice input error: ${e.error}`);
    };
    rec.onend = onEnd;
    rec.start();
    return () => rec.stop();
  },

  speak(text, locale) {
    if (!this.canSpeak()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    window.speechSynthesis.speak(u);
  },

  cancelSpeech() {
    if (this.canSpeak()) window.speechSynthesis.cancel();
  },
};
