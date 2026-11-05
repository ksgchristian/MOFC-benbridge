import type { SpeechProvider } from "./types";

/** Text-only mode. The app must stay fully usable with this provider. */
export const noSpeech: SpeechProvider = {
  id: "none",
  privacyNote: "Voice is off. Text only.",
  canListen: () => false,
  canSpeak: () => false,
  listen: (_locale, handlers) => {
    handlers.onError("Voice input is turned off.");
    handlers.onEnd();
    return () => {};
  },
  speak: () => {},
  cancelSpeech: () => {},
};
