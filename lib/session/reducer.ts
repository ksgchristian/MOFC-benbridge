import { allFields, type FormSchema } from "@/lib/forms/schema";
import { DEFAULT_NEIGHBOR_LANG } from "@/lib/languages";
import type { FieldState, SessionAction, SessionState } from "./types";

function field(state: SessionState, id: string): FieldState {
  return state.fields[id] ?? { value: "", confirmed: false };
}

function withField(state: SessionState, id: string, fs: FieldState): SessionState {
  return { ...state, fields: { ...state.fields, [id]: fs } };
}

/**
 * Guardrail: only the navigator confirms, and only after the neighbor said
 * Yes to that exact pending value and nothing about it is unclear.
 */
export function canConfirm(fs: FieldState): boolean {
  return !!fs.pending && !fs.pending.unclear && fs.neighborAnswer === "yes" && fs.pending.value !== "";
}

/** Both the neighbor and the navigator have agreed on the agreement screen. */
export function bothAgreed(state: SessionState): boolean {
  return state.agreed.neighbor && state.agreed.navigator;
}

export function initialSession(formId: string): SessionState {
  return {
    neighborLang: DEFAULT_NEIGHBOR_LANG,
    formId,
    messages: [],
    fields: {},
    flags: [],
    submitted: false,
    activeFieldId: null,
    prefs: { voice: true, readAloud: true },
    agreed: { neighbor: false, navigator: false },
    started: false,
  };
}

/** Pure reducer. All session state lives in memory and is gone on reload. */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };

    case "RESOLVE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id
            ? {
                ...m,
                status: "done",
                translated: action.translated,
                glossaryHits: action.glossaryHits,
              }
            : m,
        ),
      };

    case "FAIL_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === action.id ? { ...m, status: "error", error: action.error } : m)),
      };

    case "PROPOSE_VALUE": {
      if (state.submitted) return state;
      const prev = field(state, action.fieldId);
      const value = action.pending.value.trim();
      // Same as what's already confirmed and nothing to ask: nothing to do.
      if (prev.confirmed && prev.value === value && !action.pending.unclear && !prev.pending) return state;
      // Re-proposing the identical pending value keeps the neighbor's answer.
      if (prev.pending && prev.pending.value === value && prev.pending.unclear === action.pending.unclear) return state;
      // An UNCLEAR draft with no new value (e.g. from the neighbor's spoken "sí, antes de impuestos",
      // which doesn't repeat the number) must not wipe a clear pending value or the neighbor's answer.
      // An UNCLEAR draft with a different value still replaces it: that is a new value.
      if (prev.pending && !prev.pending.unclear && action.pending.unclear && (value === "" || value === prev.pending.value)) return state;
      // A new answer replaces any rejected one and must be answered again.
      return withField(state, action.fieldId, { ...prev, pending: { ...action.pending, value }, neighborAnswer: undefined, rejected: undefined });
    }

    case "LOAD_VALUES": {
      if (state.submitted) return state;
      let next = state;
      for (const [id, value] of Object.entries(action.values)) {
        next = sessionReducer(next, { type: "PROPOSE_VALUE", fieldId: id, pending: { value, origin: "navigator", unclear: false, ask: "" } });
      }
      return next;
    }

    case "NEIGHBOR_ANSWER": {
      if (state.submitted) return state;
      const prev = state.fields[action.fieldId];
      if (!prev?.pending || prev.pending.unclear || prev.pending.value === "") return state; // nothing to answer, or the navigator must ask first
      if (action.answer === "no") {
        // Guardrail 4: "No" is final for this value. It can't be switched to Sí or confirmed.
        const { pending, neighborAnswer: _a, ...rest } = prev;
        void _a;
        return withField(state, action.fieldId, { ...rest, rejected: pending });
      }
      return withField(state, action.fieldId, { ...prev, neighborAnswer: "yes" });
    }

    case "NAVIGATOR_CONFIRM": {
      if (state.submitted) return state;
      const prev = state.fields[action.fieldId];
      if (!prev || !canConfirm(prev)) return state;
      const p = prev.pending!;
      // Keep where the value came from in the record: a typed value never looks like a verified one.
      const source =
        p.origin === "claude" && p.quote
          ? { kind: "transcript" as const, quote: p.quote, ...(p.math ? { math: p.math } : {}) }
          : { kind: "navigator" as const };
      return withField(state, action.fieldId, { value: p.value, confirmed: true, source });
    }

    case "DISCARD_PENDING": {
      const prev = state.fields[action.fieldId];
      if (!prev?.pending || state.submitted) return state;
      return withField(state, action.fieldId, { value: prev.value, confirmed: prev.confirmed, ...(prev.source ? { source: prev.source } : {}) });
    }

    case "SET_MESSAGE_DRAFTS":
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === action.id ? { ...m, draftedFields: action.fieldIds } : m)),
      };

    case "ADD_FLAG":
      return { ...state, flags: [...state.flags, action.flag] };

    case "REMOVE_FLAG":
      return { ...state, flags: state.flags.filter((f) => f.id !== action.id) };

    // Agreement screen. Choices and agreements can only change before the session starts;
    // ending the session (RESET) brings the agreement screen back with defaults.
    case "SET_PREF":
      if (state.started) return state;
      return { ...state, prefs: { ...state.prefs, [action.pref]: action.value } };

    case "SET_AGREEMENT":
      if (state.started) return state;
      return { ...state, agreed: { ...state.agreed, [action.who]: action.agreed } };

    case "START_SESSION":
      if (state.started || !bothAgreed(state)) return state;
      return { ...state, started: true };

    case "SET_ACTIVE_FIELD":
      return state.activeFieldId === action.fieldId ? state : { ...state, activeFieldId: action.fieldId };

    case "SUBMIT":
      return state.submitted ? state : { ...state, submitted: true };

    case "RESET":
      return initialSession(state.formId);
  }
}

export interface SubmitReadiness {
  ready: boolean;
  /** Required fields with no confirmed value. */
  missingRequired: string[];
  /** Fields with a value still waiting for the neighbor's Yes and the navigator's Confirm. */
  pending: string[];
}

/**
 * Guardrail: the (mock) submit is only allowed when every required field has
 * a confirmed value and nothing is left pending.
 */
export function submitReadiness(state: SessionState, form: FormSchema): SubmitReadiness {
  const missingRequired: string[] = [];
  const pending: string[] = [];
  for (const f of allFields(form)) {
    const fs = state.fields[f.id];
    if (fs?.pending) pending.push(f.id);
    if (f.required && !(fs?.confirmed && fs.value.trim() !== "")) missingRequired.push(f.id);
  }
  return { ready: missingRequired.length === 0 && pending.length === 0, missingRequired, pending };
}
