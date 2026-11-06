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
  glossaryHits?: GlossaryHit[];
  /** Form fields Claude drafted from this line. */
  draftedFields?: string[];
  /** The line mentions a number but nothing could be drafted from it: the navigator must ask again. */
  valueUnread?: boolean;
}

/** A value waiting for the neighbor's Yes/No and the navigator's Confirm. */
export interface PendingValue {
  value: string;
  /** "claude" = drafted from the conversation; "navigator" = typed by the navigator. */
  origin: "claude" | "navigator";
  /** Units, gross/net or amount unclear: the navigator must ask before it can be confirmed. */
  unclear: boolean;
  /** Question for the navigator to ask when unclear (English). */
  ask: string;
  /** Arithmetic shown under the value, e.g. "3 adults + 2 children = 5" (done in code). */
  math?: string;
  /** Guardrail 2: exact words this was drafted from. Absent for navigator-typed values. */
  quote?: string;
}

/** Where a confirmed value came from, kept in the (in-memory) record. */
export type ValueSource = { kind: "transcript"; quote: string; math?: string } | { kind: "navigator" };

export interface FieldState {
  /** Committed value. Only the navigator's Confirm writes here. */
  value: string;
  /** True once the navigator confirmed the value (after the neighbor said Yes). */
  confirmed: boolean;
  /** Where the confirmed value came from: a quote from the conversation, or typed by the navigator. */
  source?: ValueSource;
  pending?: PendingValue;
  /** The neighbor's answer about `pending`. Cleared whenever `pending` changes. */
  neighborAnswer?: "yes";
  /**
   * Guardrail 4: a value the neighbor said No to. It can't be answered or
   * confirmed again; only a new answer (said again or re-typed) moves on.
   */
  rejected?: PendingValue;
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
  /** The question both sides are on right now (set by double-tapping a form row). */
  activeFieldId: string | null;
  /** Choices made on the agreement screen. In memory only. */
  prefs: SessionPrefs;
  /** Each person's agreement on the agreement screen. */
  agreed: Record<Speaker, boolean>;
  /** True once both agreed and tapped Start. Until then only the agreement screen shows. */
  started: boolean;
}

export interface SessionPrefs {
  /** Speech-to-text (mic buttons). Off = both people type. */
  voice: boolean;
  /** Read-aloud buttons. */
  readAloud: boolean;
}

export type SessionAction =
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "RESOLVE_MESSAGE"; id: string; translated: { lang: LangCode; text: string }; glossaryHits: GlossaryHit[] }
  | { type: "FAIL_MESSAGE"; id: string; error: string }
  | { type: "PROPOSE_VALUE"; fieldId: string; pending: PendingValue }
  | { type: "LOAD_VALUES"; values: Record<string, string> }
  | { type: "NEIGHBOR_ANSWER"; fieldId: string; answer: "yes" | "no" }
  | { type: "NAVIGATOR_CONFIRM"; fieldId: string }
  | { type: "DISCARD_PENDING"; fieldId: string }
  | { type: "SET_MESSAGE_DRAFTS"; id: string; fieldIds: string[] }
  | { type: "SET_MESSAGE_UNREAD"; id: string }
  | { type: "ADD_FLAG"; flag: Flag }
  | { type: "REMOVE_FLAG"; id: string }
  | { type: "SET_ACTIVE_FIELD"; fieldId: string | null }
  | { type: "SET_PREF"; pref: keyof SessionPrefs; value: boolean }
  | { type: "SET_AGREEMENT"; who: Speaker; agreed: boolean }
  /** Ignored unless both people have agreed. */
  | { type: "START_SESSION" }
  | { type: "SUBMIT" }
  | { type: "RESET" };
