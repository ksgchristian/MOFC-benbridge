"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { NAVIGATOR_LANG, type LangCode } from "@/lib/languages";
import { translate } from "@/lib/translate/client";
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

  const runTranslation = useCallback(async (id: string, text: string, from: LangCode, to: LangCode) => {
    try {
      const res = await translate(text, from, to);
      dispatch({
        type: "RESOLVE_MESSAGE",
        id,
        translated: { lang: to, text: res.translation },
        uncertain: res.uncertain,
        uncertaintyNote: res.uncertaintyNote,
        glossaryHits: res.glossaryHits,
      });
    } catch (err) {
      dispatch({ type: "FAIL_MESSAGE", id, error: err instanceof Error ? err.message : "Translation failed." });
    }
  }, []);

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
      await runTranslation(id, trimmed, from, to);
    },
    [langFor, runTranslation],
  );

  const retryMessage = useCallback(
    async (id: string) => {
      const msg = state.messages.find((m) => m.id === id);
      if (!msg) return;
      const to = langFor(msg.speaker === "navigator" ? "neighbor" : "navigator");
      await runTranslation(id, msg.original.text, msg.original.lang, to);
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
