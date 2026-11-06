"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { NAVIGATOR_LANG, type LangCode } from "@/lib/languages";
import { translate } from "@/lib/translate/client";
import { requestDrafts } from "@/lib/draft/client";
import { valueUnread } from "@/lib/draft/unread";
import type { FormSchema } from "@/lib/forms/schema";
import { initialSession, sessionReducer } from "./reducer";
import type { Flag, FlagTarget, SessionAction, SessionState, Speaker } from "./types";

interface SessionContextValue {
  state: SessionState;
  form: FormSchema;
  dispatch: React.Dispatch<SessionAction>;
  langFor: (speaker: Speaker) => LangCode;
  /** Add a message from `speaker` and translate it for the other side. */
  sendMessage: (speaker: Speaker, text: string) => Promise<void>;
  /** Retry translating a failed message. */
  retryMessage: (id: string) => Promise<void>;
  addFlag: (by: Speaker, target: FlagTarget, original: string, translation: string, note?: string) => void;
}

const Ctx = createContext<SessionContextValue | null>(null);

const newId = () => crypto.randomUUID();

export function SessionProvider({ form, children }: { form: FormSchema; children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, form.id, initialSession);

  const langFor = useCallback(
    (speaker: Speaker): LangCode => (speaker === "navigator" ? NAVIGATOR_LANG : state.neighborLang),
    [state.neighborLang],
  );

  // Latest messages, for the few lines of context sent with each draft request.
  const messagesRef = useRef(state.messages);
  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  /**
   * Ask Claude to draft form values from this line. Never silent: if the line mentions a
   * number and nothing was drafted (or drafting failed), the navigator is told to ask again.
   */
  const runDrafting = useCallback(
    async (id: string, speaker: Speaker, text: string, lang: LangCode) => {
      const context = messagesRef.current
        .filter((m) => m.id !== id)
        .slice(-4)
        .map((m) => ({ speaker: m.speaker, text: m.original.text }));
      try {
        const { drafts } = await requestDrafts(form.id, speaker, lang, text, context);
        for (const d of drafts) {
          dispatch({
            type: "PROPOSE_VALUE",
            fieldId: d.fieldId,
            pending: { value: d.value, origin: "claude", unclear: d.unclear, ask: d.ask, quote: d.quote, ...(d.math ? { math: d.math } : {}) },
          });
        }
        if (drafts.length) dispatch({ type: "SET_MESSAGE_DRAFTS", id, fieldIds: drafts.map((d) => d.fieldId) });
        if (valueUnread(text, drafts.length)) dispatch({ type: "SET_MESSAGE_UNREAD", id });
      } catch {
        // Drafting is a helper; the navigator can still type the value. A number that was said still gets flagged.
        if (valueUnread(text, 0)) dispatch({ type: "SET_MESSAGE_UNREAD", id });
      }
    },
    [form.id],
  );

  const runTranslation = useCallback(
    async (id: string, speaker: Speaker, text: string, from: LangCode, to: LangCode) => {
      try {
        const res = await translate(text, from, to);
        dispatch({
          type: "RESOLVE_MESSAGE",
          id,
          translated: { lang: to, text: res.translation },
          glossaryHits: res.glossaryHits,
        });
      } catch (err) {
        dispatch({ type: "FAIL_MESSAGE", id, error: err instanceof Error ? err.message : "Translation failed." });
        return;
      }
      // Translate → draft field → (neighbor Yes/No) → navigator Confirm.
      await runDrafting(id, speaker, text, from);
    },
    [runDrafting],
  );

  const sendMessage = useCallback(
    async (speaker: Speaker, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const from = langFor(speaker);
      const to = langFor(speaker === "navigator" ? "neighbor" : "navigator");
      const id = newId();
      dispatch({
        type: "ADD_MESSAGE",
        message: { id, speaker, createdAt: Date.now(), original: { lang: from, text: trimmed }, status: "pending" },
      });
      await runTranslation(id, speaker, trimmed, from, to);
    },
    [langFor, runTranslation],
  );

  const retryMessage = useCallback(
    async (id: string) => {
      const msg = state.messages.find((m) => m.id === id);
      if (!msg) return;
      const to = langFor(msg.speaker === "navigator" ? "neighbor" : "navigator");
      await runTranslation(id, msg.speaker, msg.original.text, msg.original.lang, to);
    },
    [state.messages, langFor, runTranslation],
  );

  const addFlag = useCallback(
    (by: Speaker, target: FlagTarget, original: string, translation: string, note = "") => {
      const flag: Flag = { id: newId(), createdAt: Date.now(), by, target, original, translation, note };
      dispatch({ type: "ADD_FLAG", flag });
    },
    [],
  );

  const value = useMemo(
    () => ({ state, form, dispatch, langFor, sendMessage, retryMessage, addFlag }),
    [state, form, langFor, sendMessage, retryMessage, addFlag],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
