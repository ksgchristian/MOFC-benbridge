/**
 * Swappable speech layer. The voice approach is still an open decision (see
 * README), so the app only talks to this interface. To try another provider
 * (a cloud speech-to-text service, a local model…), implement this and
 * register it in lib/speech/index.ts.
 */
export interface ListenHandlers {
  /** Called with interim and final transcripts. */
  onResult: (text: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}

export interface SpeechProvider {
  readonly id: string;
  /** Human-readable note shown in the UI, e.g. where audio is processed. */
  readonly privacyNote: string;
  canListen(): boolean;
  canSpeak(): boolean;
  /** Start listening in `locale` (BCP-47, e.g. "es-US"). Returns a stop function. */
  listen(locale: string, handlers: ListenHandlers): () => void;
  speak(text: string, locale: string): void;
  cancelSpeech(): void;
}
