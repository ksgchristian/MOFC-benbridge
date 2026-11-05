"use client";

import { useState } from "react";
import type { UiStrings } from "@/lib/i18n/ui";
import { FlagIcon } from "./Icons";

/** One-tap "this translation looks wrong". Asks for an optional note. */
export function FlagButton({ strings, onFlag }: { strings: UiStrings; onFlag: (note: string) => void }) {
  const [flagged, setFlagged] = useState(false);
  return (
    <button
      type="button"
      title={flagged ? strings.flagged : strings.flag}
      aria-label={flagged ? strings.flagged : strings.flag}
      disabled={flagged}
      onClick={() => {
        const note = window.prompt(strings.flagNotePrompt) ?? "";
        onFlag(note);
        setFlagged(true);
      }}
      className={`icon-btn ${flagged ? "!text-[var(--warn)]" : ""}`}
    >
      <FlagIcon size={15} filled={flagged} />
    </button>
  );
}
