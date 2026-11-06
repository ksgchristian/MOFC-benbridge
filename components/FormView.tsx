"use client";

import { useEffect, useRef, useState } from "react";
import { ui, type UiStrings } from "@/lib/i18n/ui";
import { displayValue } from "@/lib/forms/display";
import { YES_NO_LABELS, type FormField } from "@/lib/forms/schema";
import { useFormLabels } from "@/lib/forms/useFormLabels";
import type { LangCode } from "@/lib/languages";
import { usePauseScrollSync } from "@/lib/scrollSync";
import { canConfirm } from "@/lib/session/reducer";
import { useSession } from "@/lib/session/SessionContext";
import type { FieldState, Speaker } from "@/lib/session/types";
import { FlagButton } from "./FlagButton";
import { Highlighted } from "./Highlighted";
import { AlertIcon, CheckIcon, SparkleIcon } from "./Icons";

/**
 * The same application rendered for either side.
 * - navigator: English labels; types values (which become pending) and is the
 *   only one who can Confirm a pending value into the form.
 * - neighbor: labels in their language; read-only values; answers Sí/No on
 *   each pending value. That is the neighbor's only form action.
 * Either side can double-tap a question to mark it as the current one; it
 * lights up on both sides.
 */
export function FormView({ viewer }: { viewer: Speaker }) {
  const { form, state, langFor } = useSession();
  const lang = langFor(viewer);
  const s = ui(lang);
  const labels = useFormLabels(form, lang);

  return (
    <div className="space-y-6">
      <div className="space-y-1 px-1">
        <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--fg-muted)]">{s.form}</p>
        <h3 className="text-[22px] font-bold leading-tight tracking-tight">{labels.t("title", form.title)}</h3>
        <p className="text-[13px] text-[var(--fg-muted)]">{labels.t("disclaimer", form.disclaimer)}</p>
        <p className="text-[12px] text-[var(--fg-muted)]">{s.doubleTapHint}</p>
        {labels.loading && <p className="text-[13px] text-[var(--fg-muted)]">{s.translating}</p>}
        {labels.error && <p className="text-[13px] text-[var(--danger)]">{labels.error}</p>}
      </div>

      {form.sections.map((section) => (
        <fieldset key={section.id} disabled={state.submitted} className="min-w-0">
          <legend className="group-title">{labels.t(`section.${section.id}`, section.title)}</legend>
          <div className="card hairline overflow-hidden">
            {section.fields.map((field) => (
              <FieldRow key={field.id} field={field} viewer={viewer} labels={labels} />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

type Labels = ReturnType<typeof useFormLabels>;

const INTERACTIVE = "input, select, textarea, button, a, label";

function FieldRow({ field, viewer, labels }: { field: FormField; viewer: Speaker; labels: Labels }) {
  const { state, langFor, addFlag, dispatch } = useSession();
  const lang = langFor(viewer);
  const s = ui(lang);
  const fs: FieldState = state.fields[field.id] ?? { value: "", confirmed: false };
  const labelKey = `field.${field.id}.label`;
  const label = labels.t(labelKey, field.label);
  const help = labels.t(`field.${field.id}.help`, field.help);
  const inputId = `${viewer}-${field.id}`;
  const active = state.activeFieldId === field.id;

  // Double-tap (touch) or double-click (mouse) marks this as the current question.
  const rowRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const onPointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return; // don't hijack inputs and buttons
    const now = e.timeStamp;
    if (now - lastTap.current < 350) {
      dispatch({ type: "SET_ACTIVE_FIELD", fieldId: active ? null : field.id });
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  // When this becomes the current question, bring it into view on both sides
  // (each side scrolls itself, so linked scrolling pauses for a moment).
  const pauseSync = usePauseScrollSync();
  useEffect(() => {
    if (!active) return;
    pauseSync("form");
    rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active, pauseSync]);

  return (
    <div
      ref={rowRef}
      data-sync-key={field.id}
      onPointerUp={onPointerUp}
      aria-current={active ? "step" : undefined}
      className={`relative select-none space-y-2 px-4 py-3.5 transition-colors ${active ? "bg-[var(--accent-soft)]" : ""}`}
    >
      {active && <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-inset ring-[var(--accent)]" aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          {active && (
            <span className="chip mb-1 bg-[var(--accent)] text-[var(--on-accent)]">{s.currentQuestion}</span>
          )}
          <label htmlFor={inputId} className="block text-[15px] font-medium leading-snug">
            {label}
            {field.required && <span className="text-[var(--danger)]"> *</span>}
            {labels.isMachine(labelKey) && <span className="chip ml-1.5 !h-[18px] bg-[var(--fill)] !text-[10px] text-[var(--fg-muted)]">AI</span>}
          </label>
          {help && <p className="text-[13px] leading-snug text-[var(--fg-muted)]">{help}</p>}
        </div>
        {viewer === "neighbor" && lang !== "en" && (
          <FlagButton strings={s} onFlag={(note) => addFlag(viewer, { kind: "field", fieldId: field.id }, field.label.en, label, note)} />
        )}
      </div>

      <div className="select-text">
        {viewer === "navigator" ? (
          <NavigatorField field={field} fs={fs} inputId={inputId} s={s} labels={labels} />
        ) : (
          <NeighborField field={field} fs={fs} inputId={inputId} s={s} lang={lang} labels={labels} />
        )}
      </div>
    </div>
  );
}

function ConfirmedValue({ field, fs, lang, labels, s }: { field: FormField; fs: FieldState; lang: LangCode; labels: Labels; s: UiStrings }) {
  if (!fs.confirmed || !fs.value) return null;
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-[var(--accent)]">
      <CheckIcon size={14} /> {s.confirmed}: <span className="font-semibold">{displayValue(field, fs.value, lang, labels.t)}</span>
    </p>
  );
}

/* ---------------- Navigator ---------------- */

function NavigatorField({ field, fs, inputId, s, labels }: { field: FormField; fs: FieldState; inputId: string; s: UiStrings; labels: Labels }) {
  const { dispatch } = useSession();
  // Clicking or tabbing into a field makes it the current question, so it lights up on the other side too.
  const markCurrent = () => dispatch({ type: "SET_ACTIVE_FIELD", fieldId: field.id });
  const propose = (value: string) => {
    if (value.trim() === "") return;
    dispatch({ type: "PROPOSE_VALUE", fieldId: field.id, pending: { value, origin: "navigator", unclear: false, ask: "" } });
  };
  const p = fs.pending;
  const shown = p ? displayValue(field, p.value, "en", labels.t) : "";

  return (
    <div className="space-y-2">
      {/* Re-mount the input when the pending/committed value changes so it shows the latest. */}
      <FieldInput key={`${p?.value ?? fs.value}`} id={inputId} field={field} initial={p?.value ?? fs.value} onCommit={propose} onFocus={markCurrent} />
      <ConfirmedValue field={field} fs={fs} lang="en" labels={labels} s={s} />

      {p && (
        <div className={`space-y-2.5 rounded-xl p-3 ${p.unclear ? "bg-[var(--warn-soft)]" : "bg-[var(--fill)]"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-[var(--surface)] text-[var(--fg-muted)]">
              {p.origin === "claude" && <SparkleIcon size={12} />}
              {p.origin === "claude" ? s.draftedFromConversation : s.enteredByNavigator}
            </span>
            <span className="text-[17px] font-semibold">{shown ? <Highlighted text={shown} lang="en" /> : "—"}</span>
          </div>
          {p.unclear ? (
            <p className="flex items-start gap-1.5 text-[13px] font-medium text-[var(--warn)]">
              <AlertIcon size={14} className="mt-0.5 shrink-0" /> {s.unclearAsk} {p.ask}
            </p>
          ) : (
            <p
              className={`text-[13px] font-medium ${
                fs.neighborAnswer === "no" ? "text-[var(--danger)]" : fs.neighborAnswer === "yes" ? "text-[var(--accent)]" : "text-[var(--fg-muted)]"
              }`}
            >
              {fs.neighborAnswer === "yes" ? s.neighborSaidYes : fs.neighborAnswer === "no" ? s.neighborSaidNo : s.waitingForNeighbor}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={!canConfirm(fs)} onClick={() => dispatch({ type: "NAVIGATOR_CONFIRM", fieldId: field.id })} className="btn btn-sm btn-primary">
              <CheckIcon size={14} /> {s.confirm}
            </button>
            <button type="button" onClick={() => dispatch({ type: "DISCARD_PENDING", fieldId: field.id })} className="btn btn-sm btn-plain">
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
    return shown ? (
      <output id={inputId} className="flex items-center gap-1.5 text-[17px] font-semibold">
        <CheckIcon size={16} className="text-[var(--accent)]" /> {shown}
      </output>
    ) : (
      <output id={inputId} className="block text-[15px] text-[var(--fg-muted)]">
        {s.empty}
      </output>
    );
  }

  const shown = displayValue(field, p.value, lang, labels.t);
  return (
    <div id={inputId} className="space-y-3 rounded-xl bg-[var(--fill)] p-3">
      <p className="text-[20px] font-semibold leading-snug">{shown ? <Highlighted text={shown} lang={lang} /> : "—"}</p>
      {p.unclear ? (
        <p className="text-[13px] text-[var(--fg-muted)]">{s.navigatorWillAsk}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[15px]">{s.isThisRight}</span>
          <button
            type="button"
            aria-pressed={fs.neighborAnswer === "yes"}
            onClick={() => dispatch({ type: "NEIGHBOR_ANSWER", fieldId: field.id, answer: "yes" })}
            className={`btn min-w-20 ${fs.neighborAnswer === "yes" ? "btn-primary" : "btn-tinted"}`}
          >
            {fs.neighborAnswer === "yes" && <CheckIcon size={15} />} {s.yes}
          </button>
          <button
            type="button"
            aria-pressed={fs.neighborAnswer === "no"}
            onClick={() => dispatch({ type: "NEIGHBOR_ANSWER", fieldId: field.id, answer: "no" })}
            className={`btn min-w-20 ${
              fs.neighborAnswer === "no" ? "bg-[var(--danger)] text-white" : "bg-[var(--danger-soft)] text-[var(--danger)]"
            }`}
          >
            {s.no}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Inputs ---------------- */

/**
 * Navigator input. Text-like inputs propose on blur or Enter (not every
 * keystroke); selects propose on change.
 */
function FieldInput({
  id,
  field,
  initial,
  onCommit,
  onFocus,
}: {
  id: string;
  field: FormField;
  initial: string;
  onCommit: (v: string) => void;
  onFocus: () => void;
}) {
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
        className="field"
        onFocus={onFocus}
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
      className="field"
      type={type}
      min={type === "number" ? 0 : undefined}
      step={field.type === "money" ? "0.01" : undefined}
      inputMode={type === "number" ? "decimal" : undefined}
      value={v}
      onFocus={onFocus}
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
