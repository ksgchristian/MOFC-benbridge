"use client";

import { NavigatorPane } from "@/components/NavigatorPane";
import { NeighborPane } from "@/components/NeighborPane";
import { snapSampleForm } from "@/lib/forms/snap-sample";
import { ScrollSyncProvider } from "@/lib/scrollSync";
import { SessionProvider } from "@/lib/session/SessionContext";

/** One screen, two panes: navigator (English) | neighbor (their language). */
export default function Home() {
  return (
    <SessionProvider form={snapSampleForm}>
      <ScrollSyncProvider>
      <div className="flex h-screen flex-col">
        <header className="glass sticky top-0 z-10 border-b border-[var(--separator)]">
          <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[17px] font-semibold tracking-tight">
                Benefit<span className="text-[var(--accent)]">Bridge</span>
              </span>
              <span className="hidden text-[13px] text-[var(--fg-muted)] sm:inline">Benefits interpreter · Mid-Ohio Food Collective</span>
            </div>
            <span className="chip bg-[var(--fill)] text-[var(--fg-muted)]">Sample data only</span>
          </div>
        </header>
        <main className="mx-auto grid min-h-0 w-full max-w-[1400px] flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
          {/* English (navigator) on the left, Spanish (neighbor) on the right. */}
          <NavigatorPane />
          <NeighborPane />
        </main>
      </div>
      </ScrollSyncProvider>
    </SessionProvider>
  );
}
