import type { ReactNode } from "react";

/** Large-title header for one side of the screen. */
export function PaneHeader({ title, language, children }: { title: string; language: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-1">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[28px] font-bold leading-none tracking-tight">{title}</h2>
        <span className="chip bg-[var(--accent-soft)] text-[var(--accent)]">{language}</span>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
