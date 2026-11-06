"use client";

import { LANGUAGES } from "@/lib/languages";
import { ui } from "@/lib/i18n/ui";
import { useSession } from "@/lib/session/SessionContext";
import { Conversation } from "./Conversation";
import { FormView } from "./FormView";
import { CheckIcon } from "./Icons";
import { PaneHeader } from "./PaneHeader";
import { PaneLayout } from "./PaneLayout";

export function NeighborPane() {
  const { langFor, state } = useSession();
  const lang = langFor("neighbor");
  const s = ui(lang);

  return (
    <PaneLayout
      side="neighbor"
      lang={lang}
      top={
        <>
          <PaneHeader title={s.neighborPane} language={LANGUAGES[lang].nativeName} />
          <Conversation viewer="neighbor" />
        </>
      }
    >
      {state.submitted && (
        <div className="card flex items-center gap-2 p-4 text-[15px] font-medium text-[var(--accent)]">
          <CheckIcon /> {s.submitted}
        </div>
      )}
      <FormView viewer="neighbor" />
    </PaneLayout>
  );
}
