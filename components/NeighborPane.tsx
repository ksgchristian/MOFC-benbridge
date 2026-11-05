"use client";

import { LANGUAGES } from "@/lib/languages";
import { ui } from "@/lib/i18n/ui";
import { useSession } from "@/lib/session/SessionContext";
import { Composer } from "./Composer";
import { FormView } from "./FormView";
import { Transcript } from "./Transcript";

export function NeighborPane() {
  const { langFor, state } = useSession();
  const lang = langFor("neighbor");
  const s = ui(lang);

  return (
    <section lang={lang} className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{s.neighborPane}</h2>
        <span className="text-xs text-[var(--fg-muted)]">{LANGUAGES[lang].nativeName}</span>
      </header>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{s.conversation}</h3>
        <Transcript viewer="neighbor" />
        <Composer speaker="neighbor" />
      </div>

      {state.submitted && <p className="rounded-md bg-green-100 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-200">{s.submitted}</p>}

      <FormView viewer="neighbor" />
    </section>
  );
}
