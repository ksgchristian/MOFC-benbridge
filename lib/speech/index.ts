import { noSpeech } from "./none";
import { webSpeech } from "./webSpeech";
import type { SpeechProvider } from "./types";

const PROVIDERS: Record<string, SpeechProvider> = {
  web: webSpeech,
  none: noSpeech,
};

/** Pick with NEXT_PUBLIC_SPEECH_PROVIDER=web|none (default: web). */
export function getSpeechProvider(): SpeechProvider {
  const id = process.env.NEXT_PUBLIC_SPEECH_PROVIDER || "web";
  return PROVIDERS[id] ?? webSpeech;
}

export type { SpeechProvider } from "./types";
