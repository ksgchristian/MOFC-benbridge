"use client";

import { NavigatorPane } from "@/components/NavigatorPane";
import { NeighborPane } from "@/components/NeighborPane";
import { snapSampleForm } from "@/lib/forms/snap-sample";
import { SessionProvider } from "@/lib/session/SessionContext";

/** One screen, two panes: neighbor (their language) | navigator (English). */
export default function Home() {
  return (
    <SessionProvider form={snapSampleForm}>
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2">
          <h1 className="text-sm font-semibold">BenBridge · Mid-Ohio Food Collective prototype</h1>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Sample data only
          </span>
        </header>
        <main className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:overflow-hidden divide-y divide-[var(--border)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <NeighborPane />
          <NavigatorPane />
        </main>
      </div>
    </SessionProvider>
  );
}
