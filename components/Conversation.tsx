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
      <h3 className="module-title">{s.conversation}</h3>
      <div className="card overflow-hidden">
        <Transcript viewer={viewer} />
        <div className="border-t border-[var(--separator)] p-3">
          <Composer speaker={viewer} />
        </div>
      </div>
      {footnote && <p className="px-4 pt-2 text-[12px] text-[var(--fg-muted)]">{footnote}</p>}
    </div>
  );
}
