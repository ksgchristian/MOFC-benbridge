"use client";

import { ui } from "@/lib/i18n/ui";
import { useSession } from "@/lib/session/SessionContext";
import type { Speaker } from "@/lib/session/types";
import { Composer } from "./Composer";
import { Transcript } from "./Transcript";

/** One card: messages on top, speak/type controls at the bottom (like a chat app). */
export function Conversation({ viewer, footnote }: { viewer: Speaker; footnote?: string }) {
  const { langFor } = useSession();
  const s = ui(langFor(viewer));
  return (
    <div>
      {/* A floating chat bubble: title, messages and the mic/typing controls in one rounded card. */}
      <div className="bubble-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-4">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
          <h3 className="module-title !p-0">{s.conversation}</h3>
        </div>
        <Transcript viewer={viewer} />
        <div className="border-t border-[var(--separator)] px-4 py-3">
          <Composer speaker={viewer} />
        </div>
      </div>
      {footnote && <p className="px-4 pt-2 text-[12px] text-[var(--fg-muted)]">{footnote}</p>}
    </div>
  );
}
