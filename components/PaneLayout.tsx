"use client";

import type { ReactNode } from "react";
import { useSyncedScroll } from "@/lib/scrollSync";
import type { Speaker } from "@/lib/session/types";

/**
 * One side of the screen: title on top, the application in the middle, the
 * conversation pinned at the bottom (like a chat app). On desktop only the
 * application scrolls, so the conversation is always visible while working
 * through the questions. On narrow screens it's one normal scrolling column.
 */
export function PaneLayout({
  side,
  header,
  bottom,
  children,
  className = "",
  lang,
}: {
  side: Speaker;
  header: ReactNode;
  bottom: ReactNode;
  children: ReactNode;
  className?: string;
  lang: string;
}) {
  // The application area scrolls in step with the other side (lined up by question).
  const formScrollRef = useSyncedScroll("form", side);
  return (
    <section lang={lang} className={`flex min-w-0 flex-col lg:h-full lg:min-h-0 ${className}`}>
      <div className="flex h-[72px] shrink-0 items-center border-b border-[var(--separator)] px-5">{header}</div>
      <div ref={formScrollRef} className="relative lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="space-y-6 px-5 pb-6 pt-5">{children}</div>
        {/* Soft fade so it's clear the application slides under the conversation. */}
        <div className="pointer-events-none sticky bottom-0 z-[1] -mt-8 hidden h-8 bg-gradient-to-t from-[var(--bg)] to-transparent lg:block" aria-hidden />
      </div>
      <div className="shrink-0 px-4 pb-4 pt-1">{bottom}</div>
    </section>
  );
}
