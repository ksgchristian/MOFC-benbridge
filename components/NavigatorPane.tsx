"use client";

import { ui } from "@/lib/i18n/ui";
import { allFields } from "@/lib/forms/schema";
import { sampleNeighbors } from "@/lib/forms/sample-neighbors";
import { submitReadiness } from "@/lib/session/reducer";
import { useSession } from "@/lib/session/SessionContext";
import { getSpeechProvider } from "@/lib/speech";
import { Conversation } from "./Conversation";
import { FlagsPanel } from "./FlagsPanel";
import { FormView } from "./FormView";
import { CheckIcon } from "./Icons";
import { PaneHeader } from "./PaneHeader";
import { PaneLayout } from "./PaneLayout";

export function NavigatorPane() {
  const { state, form, dispatch, langFor } = useSession();
  const s = ui(langFor("navigator"));
  const readiness = submitReadiness(state, form);
  const labelOf = (id: string) => allFields(form).find((f) => f.id === id)?.label.en ?? id;

  return (
    <PaneLayout
      side="navigator"
      lang="en"
      className="lg:border-r lg:border-[var(--separator)]"
      header={
        <PaneHeader title={s.navigatorPane} language="English">
          <select
            aria-label={s.loadSample}
            className="field !h-[30px] !w-auto max-w-[11rem] !rounded-full !px-3 text-[13px]"
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
            className="btn btn-sm btn-gray"
          >
            {s.reset}
          </button>
        </PaneHeader>
      }
      bottom={<Conversation viewer="navigator" />}
    >
      <FormView viewer="navigator" />

      <div className="card space-y-3 p-4">
        {state.submitted ? (
          <p className="flex items-center gap-2 text-[15px] font-medium text-[var(--accent)]">
            <CheckIcon /> {s.submitted}
          </p>
        ) : (
          <>
            {!readiness.ready && (
              <div className="space-y-1 text-[13px] text-[var(--fg-muted)]">
                <p className="font-semibold text-[var(--fg)]">{s.submitBlocked}</p>
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
            <button type="button" disabled={!readiness.ready} onClick={() => dispatch({ type: "SUBMIT" })} className="btn btn-lg btn-primary w-full">
              {s.submit}
            </button>
          </>
        )}
      </div>

      <FlagsPanel />
      <p className="px-1 text-[12px] text-[var(--fg-muted)]">{getSpeechProvider().privacyNote}</p>
    </PaneLayout>
  );
}
