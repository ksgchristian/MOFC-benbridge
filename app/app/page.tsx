"use client";

import { ConsentScreen } from "@/components/ConsentScreen";
import { NavigatorPane } from "@/components/NavigatorPane";
import { NeighborPane } from "@/components/NeighborPane";
import { consent } from "@/lib/glossary/consent";
import { snapSampleForm } from "@/lib/forms/snap-sample";
import { ScrollSyncProvider } from "@/lib/scrollSync";
import { SessionProvider, useSession } from "@/lib/session/SessionContext";

/**
 * The agreement screen first (every page load and after End session), then
 * one screen with two panes: navigator (English) | neighbor (their language).
 */
export default function Home() {
  return (
    <SessionProvider form={snapSampleForm}>
      <ScrollSyncProvider>
        <AppScreen />
      </ScrollSyncProvider>
    </SessionProvider>
  );
}

function AppScreen() {
  const { state, dispatch } = useSession();

  const endSession = () => {
    if (confirm(`${consent.endSessionConfirm.es}\n\n${consent.endSessionConfirm.en}`)) dispatch({ type: "RESET" });
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="glass sticky top-0 z-10 border-b border-[var(--separator)]">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-semibold tracking-tight">
              Benefit<span className="text-[var(--accent)]">Bridge</span>
            </span>
            <span className="hidden text-[13px] text-[var(--fg-muted)] sm:inline">Benefits interpreter · Mid-Ohio Food Collective</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="chip bg-[var(--fill)] text-[var(--fg-muted)]">Sample data only</span>
            {state.started && (
              <button type="button" onClick={endSession} className="btn btn-sm btn-gray">
                <span lang="es">{consent.endSession.es}</span>
                <span className="text-[var(--fg-muted)]">·</span>
                <span lang="en">{consent.endSession.en}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {state.started ? (
        <main className="mx-auto grid min-h-0 w-full max-w-[1400px] flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
          {/* English (navigator) on the left, Spanish (neighbor) on the right. */}
          <NavigatorPane />
          <NeighborPane />
        </main>
      ) : (
        <ConsentScreen />
      )}
    </div>
  );
}
