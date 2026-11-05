"use client";

import { useState } from "react";
import { ui, type UiStrings } from "@/lib/i18n/ui";
import { displayValue } from "@/lib/forms/display";
import { YES_NO_LABELS, type FormField } from "@/lib/forms/schema";
import { useFormLabels } from "@/lib/forms/useFormLabels";
import type { LangCode } from "@/lib/languages";
import { canConfirm } from "@/lib/session/reducer";
import { useSession } from "@/lib/session/SessionContext";
import type { FieldState, Speaker } from "@/lib/session/types";
import { FlagButton } from "./FlagButton";
import { Highlighted } from "./Highlighted";

/**
 * The same application rendered for either side.
 * - navigator: English labels; types values (which become pending) and is the
 *   only one who can Confirm a pending value into the form.
 * - neighbor: labels in their language; read-only values; answers Sí/No on
 *   each pending value. That is the neighbor's only form action.
 */
export function FormView({ viewer }: { viewer: Speaker }) {
  const { form, state, langFor } = useSession();
  const lang = langFor(viewer);
  const s = ui(lang);
  const labels = useFormLabels(form, lang);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{labels.t("title", form.title)}</h3>
        <p className="text-xs text-[var(--fg-muted)]">{labels.t("disclaimer", form.disclaimer)}</p>
        {labels.loading && <p className="text-xs italic text-[var(--fg-muted)]">{s.translating}</p>}
        {labels.error && <p className="text-xs text-red-600">{labels.error}</p>}
      </div>

      {form.sections.map((section) => (
        <fieldset key={section.id} className="space-y-3 rounded-md border border-[var(--border)] p-3" disabled={state.submitted}>
          <legend className="px-1 text-sm font-medium">{labels.t(`section.${section.id}`, section.title)}</legend>
          {section.fields.map((field) => (
            <FieldRow key={field.id} field={field} viewer={viewer} labels={labels} />
          ))}
        </fieldset>
      ))}
    </div>
  );
}

type Labels = ReturnType<typeof useFormLabels>;

function FieldRow({ field, viewer, labels }: { field: FormField; viewer: Speaker; labels: Labels }) {
  const { state, langFor, addFlag } = useSession();
  const lang = langFor(viewer);
  const s = ui(lang);
  const fs: FieldState = state.fields[field.id] ?? { value: "", confirmed: false };
  const labelKey = `field.${field.id}.label`;
  const label = labels.t(labelKey, field.label);
  const help = labels.t(`field.${field.id}.help`, field.help);
  const inputId = `${viewer}-${field.id}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <label htmlFor={inputId} className="text-sm">
          {label}
          {field.required && <span className="text-red-600"> *</span>}
          {labels.isMachine(labelKey) && (
            <span className="ml-1 rounded bg-[var(--muted)] px-1 text-[10px] uppercase text-[var(--fg-muted)]">AI</span>
          )}
        </label>
        {viewer === "neighbor" && lang !== "en" && (
          <FlagButton strings={s} onFlag={(note) => addFlag(viewer, { kind: "field", fieldId: field.id }, field.label.en, label, note)} />
        )}
      </div>
      {help && <p className="text-xs text-[var(--fg-muted)]">{help}</p>}

      {viewer === "navigator" ? (
        <NavigatorField field={field} fs={fs} inputId={inputId} s={s} labels={labels} />
      ) : (
        <NeighborField field={field} fs={fs} inputId={inputId} s={s} lang={lang} labels={labels} />
      )}
    </div>
  );
}

function ConfirmedValue({ field, fs, lang, labels, s }: { field: FormField; fs: FieldState; lang: LangCode; labels: Labels; s: UiStrings }) {
  if (!fs.confirmed || !fs.value) return null;
  return (
    <p className="text-sm text-green-700 dark:text-green-400">
      ✓ {s.confirmed}: <span className="font-medium">{displayValue(field, fs.value, lang, labels.t)}</span>
    </p>
  );
}

/* ---------------- Navigator ---------------- */

function NavigatorField({ field, fs, inputId, s, labels }: { field: FormField; fs: FieldState; inputId: string; s: UiStrings; labels: Labels }) {
  const { dispatch } = useSession();
  const propose = (value: string) => {
    if (value.trim() === "") return;
    dispatch({ type: "PROPOSE_VALUE", fieldId: field.id, pending: { value, origin: "navigator", unclear: false, ask: "" } });
  };
  const p = fs.pending;
  const shown = p ? displayValue(field, p.value, "en", labels.t) : "";

  return (
    <div className="space-y-2">
      {/* Re-mount the input when the pending/committed value changes so it shows the latest. */}
      <FieldInput key={`${p?.value ?? fs.value}`} id={inputId} field={field} initial={p?.value ?? fs.value} onCommit={propose} />
      <ConfirmedValue field={field} fs={fs} lang="en" labels={labels} s={s} />

      {p && (
        <div className={`space-y-1.5 rounded-md border p-2 text-sm ${p.unclear ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40" : "border-[var(--border)] bg-[var(--muted)]"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--fg-muted)]">
              {p.origin === "claude" ? `✎ ${s.draftedFromConversation}` : s.enteredByNavigator}
            </span>
            <span className="font-medium">{shown ? <Highlighted text={shown} lang="en" /> : "—"}</span>
          </div>
          {p.unclear ? (
            <p className="text-amber-800 dark:text-amber-300">
              ⚠ {s.unclearAsk} {p.ask}
            </p>
          ) : (
            <p className={`text-xs ${fs.neighborAnswer === "no" ? "text-red-600" : fs.neighborAnswer === "yes" ? "text-green-700 dark:text-green-400" : "text-[var(--fg-muted)]"}`}>
              {fs.neighborAnswer === "yes" ? `✓ ${s.neighborSaidYes}` : fs.neighborAnswer === "no" ? `✕ ${s.neighborSaidNo}` : s.waitingForNeighbor}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canConfirm(fs)}
              onClick={() => dispatch({ type: "NAVIGATOR_CONFIRM", fieldId: field.id })}
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {s.confirm}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "DISCARD_PENDING", fieldId: field.id })}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface)]"
            >
              {s.discard}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Neighbor ---------------- */

function NeighborField({
  field,
  fs,
  inputId,
  s,
  lang,
  labels,
}: {
  field: FormField;
  fs: FieldState;
  inputId: string;
  s: UiStrings;
  lang: LangCode;
  labels: Labels;
}) {
  const { dispatch } = useSession();
  const p = fs.pending;

  if (!p) {
    const shown = fs.confirmed ? displayValue(field, fs.value, lang, labels.t) : "";
    return (
      <output id={inputId} className={`block min-h-9 rounded-md bg-[var(--muted)] px-3 py-2 text-sm ${shown ? "" : "text-[var(--fg-muted)]"}`}>
        {shown ? `✓ ${shown}` : s.empty}
      </output>
    );
  }

  const shown = displayValue(field, p.value, lang, labels.t);
  return (
    <div id={inputId} className="space-y-2 rounded-md border border-[var(--accent)] p-2">
      <p className="text-base font-medium">{shown ? <Highlighted text={shown} lang={lang} /> : "—"}</p>
      {p.unclear ? (
        <p className="text-sm text-[var(--fg-muted)]">{s.navigatorWillAsk}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{s.isThisRight}</span>
          {(["yes", "no"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={fs.neighborAnswer === a}
              onClick={() => dispatch({ type: "NEIGHBOR_ANSWER", fieldId: field.id, answer: a })}
              className={`min-w-16 rounded-md px-4 py-2 text-sm font-semibold ${
                fs.neighborAnswer === a
                  ? a === "yes"
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                  : a === "yes"
                    ? "border-2 border-green-600 text-green-700 dark:text-green-400"
                    : "border-2 border-red-600 text-red-700 dark:text-red-400"
              }`}
            >
              {a === "yes" ? s.yes : s.no}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Inputs ---------------- */

const inputClass = "w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm";

/**
 * Navigator input. Text-like inputs propose on blur or Enter (not every
 * keystroke); selects propose on change.
 */
function FieldInput({ id, field, initial, onCommit }: { id: string; field: FormField; initial: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(initial);
  const commit = () => {
    if (v !== initial) onCommit(v);
  };

  if (field.type === "select" || field.type === "yesno") {
    const options =
      field.type === "select"
        ? field.options.map((o) => ({ value: o.value, label: o.label.en }))
        : (["yes", "no"] as const).map((k) => ({ value: k, label: YES_NO_LABELS[k].en }));
    return (
      <select
        id={id}
        className={inputClass}
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          if (e.target.value) onCommit(e.target.value);
        }}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  const type = field.type === "money" || field.type === "number" ? "number" : field.type === "phone" ? "tel" : field.type;
  return (
    <input
      id={id}
      className={inputClass}
      type={type}
      min={type === "number" ? 0 : undefined}
      step={field.type === "money" ? "0.01" : undefined}
      inputMode={type === "number" ? "decimal" : undefined}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}
