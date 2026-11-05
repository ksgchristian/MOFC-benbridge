"use client";

import { useState } from "react";
import type { UiStrings } from "@/lib/i18n/ui";

/** One-tap "this translation looks wrong". Asks for an optional note. */
export function FlagButton({ strings, onFlag }: { strings: UiStrings; onFlag: (note: string) => void }) {
  const [flagged, setFlagged] = useState(false);
  return (
    <button
      type="button"
      title={strings.flag}
      aria-label={strings.flag}
      disabled={flagged}
      onClick={() => {
        const note = window.prompt(strings.flagNotePrompt) ?? "";
        onFlag(note);
        setFlagged(true);
      }}
      className="rounded px-1.5 py-0.5 text-xs text-amber-700 hover:bg-amber-100 disabled:text-amber-500 disabled:hover:bg-transparent dark:text-amber-400 dark:hover:bg-amber-950"
    >
      {flagged ? `⚑ ${strings.flagged}` : "⚑"}
    </button>
  );
}
