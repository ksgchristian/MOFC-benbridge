import { allFields, type FormSchema } from "@/lib/forms/schema";
import { DEFAULT_NEIGHBOR_LANG } from "@/lib/languages";
import type { SessionAction, SessionState } from "./types";

export function initialSession(formId: string): SessionState {
  return {
    neighborLang: DEFAULT_NEIGHBOR_LANG,
    formId,
    messages: [],
    fields: {},
    flags: [],
    submitted: false,
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
                uncertain: action.uncertain,
                uncertaintyNote: action.uncertaintyNote,
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

    case "SET_FIELD": {
      if (state.submitted) return state;
      const prev = state.fields[action.fieldId];
      if (prev?.value === action.value) return state;
      // Any change invalidates the neighbor's confirmation.
      return { ...state, fields: { ...state.fields, [action.fieldId]: { value: action.value, confirmed: false } } };
    }

    case "LOAD_VALUES": {
      if (state.submitted) return state;
      const fields = { ...state.fields };
      for (const [id, value] of Object.entries(action.values)) {
        fields[id] = { value, confirmed: false };
      }
      return { ...state, fields };
    }

    case "CONFIRM_FIELD": {
      if (state.submitted) return state;
      const prev = state.fields[action.fieldId];
      if (!prev || prev.value.trim() === "") return state; // nothing to confirm
      return { ...state, fields: { ...state.fields, [action.fieldId]: { ...prev, confirmed: action.confirmed } } };
    }

    case "ADD_FLAG":
      return { ...state, flags: [...state.flags, action.flag] };

    case "REMOVE_FLAG":
      return { ...state, flags: state.flags.filter((f) => f.id !== action.id) };

    case "SUBMIT":
      return state.submitted ? state : { ...state, submitted: true };

    case "RESET":
      return initialSession(state.formId);
  }
}

export interface SubmitReadiness {
  ready: boolean;
  missingRequired: string[];
  unconfirmed: string[];
}

/**
 * Guardrail: the (mock) submit is only allowed when every required field has
 * a value AND every field with a value has been confirmed by the neighbor.
 */
export function submitReadiness(state: SessionState, form: FormSchema): SubmitReadiness {
  const missingRequired: string[] = [];
  const unconfirmed: string[] = [];
  for (const field of allFields(form)) {
    const fs = state.fields[field.id];
    const hasValue = !!fs && fs.value.trim() !== "";
    if (field.required && !hasValue) missingRequired.push(field.id);
    if (hasValue && !fs.confirmed) unconfirmed.push(field.id);
  }
  return { ready: missingRequired.length === 0 && unconfirmed.length === 0, missingRequired, unconfirmed };
}
