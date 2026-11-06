"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Speaker } from "@/lib/session/types";

/**
 * Linked scrolling between the two panes.
 *
 * The two sides aren't the same height (Spanish labels are longer, one side
 * has inputs and the other has answers), so we can't copy scrollTop. Instead
 * each scrollable area marks its rows with `data-sync-key` (a field id or a
 * message id). When one side scrolls, we find the row at its top edge and
 * scroll the other side so the same row sits at the same spot.
 */
export type SyncGroup = "form" | "chat";

const SIDES: Speaker[] = ["navigator", "neighbor"];

class ScrollSyncRegistry {
  private els = new Map<string, HTMLElement>();
  /** Ignore scroll events on an element until this time (they were caused by us). */
  private echoUntil = new WeakMap<HTMLElement, number>();
  /** Pause syncing a whole group, e.g. while both sides auto-scroll on their own. */
  private pausedUntil = new Map<SyncGroup, number>();

  register(group: SyncGroup, side: Speaker, el: HTMLElement): () => void {
    const key = `${group}:${side}`;
    this.els.set(key, el);
    const onScroll = () => this.sync(group, side);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (this.els.get(key) === el) this.els.delete(key);
    };
  }

  pause(group: SyncGroup, ms: number) {
    this.pausedUntil.set(group, performance.now() + ms);
  }

  private sync(group: SyncGroup, side: Speaker) {
    const now = performance.now();
    if (now < (this.pausedUntil.get(group) ?? 0)) return;
    const src = this.els.get(`${group}:${side}`);
    const dst = this.els.get(`${group}:${SIDES.find((s) => s !== side)}`);
    if (!src || !dst) return;
    if (now < (this.echoUntil.get(src) ?? 0)) return; // this scroll came from syncing, don't bounce it back
    // Only when the area actually scrolls on its own (desktop layout).
    if (src.scrollHeight <= src.clientHeight || dst.scrollHeight <= dst.clientHeight) return;

    const target = this.targetScrollTop(src, dst);
    if (target == null || Math.abs(dst.scrollTop - target) < 1) return;
    this.echoUntil.set(dst, now + 120);
    dst.scrollTop = target;
  }

  private targetScrollTop(src: HTMLElement, dst: HTMLElement): number | null {
    // Edges: keep top-with-top and bottom-with-bottom.
    if (src.scrollTop <= 0) return 0;
    if (src.scrollTop + src.clientHeight >= src.scrollHeight - 1) return dst.scrollHeight - dst.clientHeight;

    const srcTop = src.getBoundingClientRect().top;
    let anchor: HTMLElement | null = null;
    for (const el of src.querySelectorAll<HTMLElement>("[data-sync-key]")) {
      if (el.getBoundingClientRect().bottom > srcTop) {
        anchor = el;
        break;
      }
    }
    if (!anchor) return null;
    const key = anchor.dataset.syncKey!;
    const match = dst.querySelector<HTMLElement>(`[data-sync-key="${CSS.escape(key)}"]`);
    if (!match) return null;

    const a = anchor.getBoundingClientRect();
    const fraction = (srcTop - a.top) / Math.max(a.height, 1); // how far into the row the top edge is
    const m = match.getBoundingClientRect();
    const matchTopInDst = m.top - dst.getBoundingClientRect().top + dst.scrollTop;
    return matchTopInDst + fraction * m.height;
  }
}

const Ctx = createContext<ScrollSyncRegistry | null>(null);

export function ScrollSyncProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(() => new ScrollSyncRegistry());
  return <Ctx.Provider value={registry}>{children}</Ctx.Provider>;
}

/** Callback ref for a scrollable area that should stay lined up with the other side. */
export function useSyncedScroll(group: SyncGroup, side: Speaker) {
  const registry = useContext(Ctx);
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el || !registry) return;
      return registry.register(group, side, el);
    },
    [registry, group, side],
  );
}

/** Pause syncing a group briefly, e.g. right before both sides scroll themselves. */
export function usePauseScrollSync() {
  const registry = useContext(Ctx);
  return useCallback((group: SyncGroup, ms = 700) => registry?.pause(group, ms), [registry]);
}
