"use client";

import { ui } from "@/lib/i18n/ui";
import { allFields } from "@/lib/forms/schema";
import { sampleNeighbors } from "@/lib/forms/sample-neighbors";
import { submitReadiness } from "@/lib/session/reducer";
import { useSession } from "@/lib/session/SessionContext";
import { getSpeechProvider } from "@/lib/speech";
import { Composer } from "./Composer";
import { FlagsPanel } from "./FlagsPanel";
import { FormView } from "./FormView";
import { Transcript } from "./Transcript";

export function NavigatorPane() {
  const { state, form, dispatch, langFor } = useSession();
  const s = ui(langFor("navigator"));
  const readiness = submitReadiness(state, form);
  const labelOf = (id: string) => allFields(form).find((f) => f.id === id)?.label.en ?? id;

  return (
    <section lang="en" className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{s.navigatorPane}</h2>
        <div className="flex gap-2">
          <select
            aria-label={s.loadSample}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            value=""
            onChange={(e) => {
              const n = sampleNeighbors.find((x) => x.id === e.target.value);
              if (n) dispatch({ type: "LOAD_VALUES", values: n.values });
            }}
          >
            <option value="">{s.loadSample}…</option>
            {sampleNeighbors.map((n) => (
              <option key={n.id} value={n.id}>
                {n.description}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => confirm("Clear the conversation, form, and flags?") && dispatch({ type: "RESET" })}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--muted)]"
          >
            {s.reset}
          </button>
        </div>
      </header>

      <p className="text-xs text-[var(--fg-muted)]">{getSpeechProvider().privacyNote}</p>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{s.conversation}</h3>
        <Transcript viewer="navigator" />
        <Composer speaker="navigator" />
      </div>

      <FormView viewer="navigator" />

      <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
        {state.submitted ? (
          <p className="text-sm text-green-700 dark:text-green-400">{s.submitted}</p>
        ) : (
          <>
            {!readiness.ready && (
              <div className="text-xs text-[var(--fg-muted)]">
                <p className="font-medium">{s.submitBlocked}</p>
                {readiness.missingRequired.length > 0 && (
                  <p>
                    {s.missingRequired}: {readiness.missingRequired.map(labelOf).join(", ")}
                  </p>
                )}
                {readiness.pending.length > 0 && (
                  <p>
                    {s.waitingConfirm}: {readiness.pending.map(labelOf).join(", ")}
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              disabled={!readiness.ready}
              onClick={() => dispatch({ type: "SUBMIT" })}
              className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {s.submit}
            </button>
          </>
        )}
      </div>

      <FlagsPanel />
    </section>
  );
}
