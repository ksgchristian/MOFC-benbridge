import type { ReactNode } from "react";

/**
 * One side of the screen. On desktop the top part (title + conversation)
 * stays put and only the bottom part (the form) scrolls, so the conversation
 * is always visible while working through the questions. On narrow screens
 * it's one normal scrolling column.
 */
export function PaneLayout({ top, children, className = "", lang }: { top: ReactNode; children: ReactNode; className?: string; lang: string }) {
  return (
    <section lang={lang} className={`flex min-w-0 flex-col lg:h-full lg:min-h-0 ${className}`}>
      <div className="shrink-0 space-y-4 px-5 pb-4 pt-6">{top}</div>
      <div className="relative border-t border-[var(--separator)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {/* Soft fade so it's clear the form slides under the conversation. */}
        <div className="pointer-events-none sticky top-0 z-[1] hidden h-4 bg-gradient-to-b from-[var(--bg)] to-transparent lg:block" aria-hidden />
        <div className="space-y-6 px-5 pb-10 pt-2">{children}</div>
      </div>
    </section>
  );
}
