"use client";

import { ui } from "@/lib/i18n/ui";
import { NAVIGATOR_LANG } from "@/lib/languages";
import { useSession } from "@/lib/session/SessionContext";

/**
 * Flags raised in this session. Staff export them and review each one; good
 * corrections become entries in lib/glossary/<lang>.json.
 */
export function FlagsPanel() {
  const { state, dispatch } = useSession();
  const s = ui(NAVIGATOR_LANG);

  const exportFlags = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      formId: state.formId,
      neighborLang: state.neighborLang,
      flags: state.flags,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translation-flags-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          ⚑ {s.flags} ({state.flags.length})
        </h3>
        <button
          type="button"
          disabled={state.flags.length === 0}
          onClick={exportFlags}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--muted)] disabled:opacity-40"
        >
          {s.exportFlags}
        </button>
      </div>
      {state.flags.length === 0 ? (
        <p className="text-xs text-[var(--fg-muted)]">{s.noFlags}</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {state.flags.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-2 rounded bg-[var(--muted)] p-2">
              <div>
                <p>
                  <span className="font-medium">{f.by}</span> · {f.target.kind}: “{f.original}” → “{f.translation}”
                </p>
                {f.note && <p className="text-[var(--fg-muted)]">{f.note}</p>}
              </div>
              <button type="button" className="text-[var(--fg-muted)] hover:underline" onClick={() => dispatch({ type: "REMOVE_FLAG", id: f.id })}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
