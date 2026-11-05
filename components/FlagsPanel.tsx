"use client";

import { ui } from "@/lib/i18n/ui";
import { NAVIGATOR_LANG } from "@/lib/languages";
import { useSession } from "@/lib/session/SessionContext";
import { FlagIcon, XIcon } from "./Icons";

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
    <section>
      <div className="flex items-center justify-between pr-1">
        <h3 className="group-title !pb-0">
          {s.flags} ({state.flags.length})
        </h3>
        <button type="button" disabled={state.flags.length === 0} onClick={exportFlags} className="btn btn-sm btn-plain">
          {s.exportFlags}
        </button>
      </div>
      <div className="card hairline mt-1.5 overflow-hidden">
        {state.flags.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-[var(--fg-muted)]">{s.noFlags}</p>
        ) : (
          state.flags.map((f) => (
            <div key={f.id} className="flex items-start gap-3 px-4 py-3 text-[13px]">
              <FlagIcon size={14} filled className="mt-0.5 shrink-0 text-[var(--warn)]" />
              <div className="min-w-0 flex-1">
                <p className="break-words">
                  <span className="font-semibold capitalize">{f.by}</span>
                  <span className="text-[var(--fg-muted)]"> · {f.target.kind}</span>
                </p>
                <p className="break-words">
                  “{f.original}” → “{f.translation}”
                </p>
                {f.note && <p className="text-[var(--fg-muted)]">{f.note}</p>}
              </div>
              <button type="button" aria-label="Remove flag" className="icon-btn" onClick={() => dispatch({ type: "REMOVE_FLAG", id: f.id })}>
                <XIcon size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
