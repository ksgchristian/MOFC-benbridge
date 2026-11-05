import type { LangCode } from "@/lib/languages";
import type { GlossaryHit } from "@/lib/glossary";

export type Speaker = "neighbor" | "navigator";

export interface Message {
  id: string;
  speaker: Speaker;
  createdAt: number;
  original: { lang: LangCode; text: string };
  /** Filled in when translation succeeds. */
  translated?: { lang: LangCode; text: string };
  status: "pending" | "done" | "error";
  error?: string;
  uncertain?: boolean;
  uncertaintyNote?: string;
  glossaryHits?: GlossaryHit[];
}

export interface FieldState {
  value: string;
  /** Neighbor has confirmed this value is correct. Reset whenever the value changes. */
  confirmed: boolean;
}

export type FlagTarget =
  | { kind: "message"; messageId: string }
  | { kind: "field"; fieldId: string };

/** A "this translation looks wrong" report. Exported for staff glossary review. */
export interface Flag {
  id: string;
  createdAt: number;
  by: Speaker;
  target: FlagTarget;
  original: string;
  translation: string;
  note: string;
}

export interface SessionState {
  neighborLang: LangCode;
  formId: string;
  messages: Message[];
  fields: Record<string, FieldState>;
  flags: Flag[];
  submitted: boolean;
}

export type SessionAction =
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "RESOLVE_MESSAGE"; id: string; translated: { lang: LangCode; text: string }; uncertain: boolean; uncertaintyNote: string; glossaryHits: GlossaryHit[] }
  | { type: "FAIL_MESSAGE"; id: string; error: string }
  | { type: "SET_FIELD"; fieldId: string; value: string }
  | { type: "LOAD_VALUES"; values: Record<string, string> }
  | { type: "CONFIRM_FIELD"; fieldId: string; confirmed: boolean }
  | { type: "ADD_FLAG"; flag: Flag }
  | { type: "REMOVE_FLAG"; id: string }
  | { type: "SUBMIT" }
  | { type: "RESET" };
