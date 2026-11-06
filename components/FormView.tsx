"use client";

import { useEffect, useRef, useState } from "react";
import { ui, type UiStrings } from "@/lib/i18n/ui";
import { displayValue } from "@/lib/forms/display";
import { encodeMoney, parseMoney, PERIOD_LABEL, PERIODS, type Period } from "@/lib/forms/money";
import { YES_NO_LABELS, type FormField } from "@/lib/forms/schema";
import { useFormLabels } from "@/lib/forms/useFormLabels";
import type { LangCode } from "@/lib/languages";
import { usePauseScrollSync } from "@/lib/scrollSync";
import { ASK } from "@/lib/draft/normalize";
import { canConfirm } from "@/lib/session/reducer";
import { buildReadback, readbackToString } from "@/lib/readback";
import { numbersCheckOut } from "@/lib/verify/fieldNumbers";
import { useSession } from "@/lib/session/SessionContext";
import type { FieldState, PendingValue, Speaker } from "@/lib/session/types";
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
        <h2 className="module-title !px-0 !pb-1">{s.form}</h2>
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
  const { state, langFor, dispatch } = useSession();
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
  if (!confirmedNumbersOk(field, fs)) {
    return <p className="text-[13px] font-medium text-[var(--danger)]">{ASK.number_unverified}</p>;
  }
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-[var(--accent)]">
      <CheckIcon size={14} /> {s.confirmed}: <span className="font-semibold">{displayValue(field, fs.value, lang, labels.t)}</span>
      <span className="font-normal text-[var(--fg-muted)]">
        {fs.source?.kind === "transcript" ? `← “${fs.source.quote}”` : `· ${s.enteredByNavigator}`}
      </span>
    </p>
  );
}

/**
 * Guardrail 2: where a value came from, shown right under it. A quote from the
 * conversation, or "Entered by navigator" for typed values, so a typed value
 * never looks like a verified one.
 */
function Provenance({ origin, quote, s }: { origin: "claude" | "navigator" | "transcript"; quote?: string; s: UiStrings }) {
  if (origin === "navigator") {
    return <p className="text-[13px] font-medium text-[var(--fg-muted)]">✎ {s.enteredByNavigator}</p>;
  }
  if (!quote) return null;
  return (
    <p className="text-[13px] italic leading-snug text-[var(--fg-muted)]">
      ← “{quote}”
    </p>
  );
}

/**
 * Guardrail 3, checked again right before rendering: a drafted number is only
 * shown if it appears in its quote. Typed values have no quote to check.
 */
function pendingNumbersOk(field: FormField, p: PendingValue): boolean {
  return p.origin !== "claude" || numbersCheckOut(field, p.value, p.quote ?? "", p.math);
}

function confirmedNumbersOk(field: FormField, fs: FieldState): boolean {
  return fs.source?.kind !== "transcript" || numbersCheckOut(field, fs.value, fs.source.quote, fs.source.math);
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
  const numbersOk = p ? pendingNumbersOk(field, p) : true;
  const shown = p && numbersOk ? displayValue(field, p.value, "en", labels.t) : "";
  const blocked = !!p && (p.unclear || !numbersOk);

  return (
    <div className="space-y-2">
      {/* Re-mount the input when the pending/committed value changes so it shows the latest. */}
      <FieldInput key={`${p?.value ?? fs.value}`} id={inputId} field={field} initial={p?.value ?? fs.value} onCommit={propose} onFocus={markCurrent} />
      <ConfirmedValue field={field} fs={fs} lang="en" labels={labels} s={s} />

      {!p && fs.rejected && (
        <div className="inset-box space-y-1 bg-[var(--danger-soft)]">
          <p className="flex items-start gap-1.5 text-[13px] font-medium text-[var(--danger)]">
            <AlertIcon size={14} className="mt-0.5 shrink-0" />
            {s.neighborSaidNoTo} “{displayValue(field, fs.rejected.value, "en", labels.t)}”.
          </p>
          <p className="text-[12px] text-[var(--fg-muted)]">{s.rejectedFixHint}</p>
        </div>
      )}

      {p && (
        <div className={`inset-box space-y-2.5 ${blocked ? "bg-[var(--warn-soft)]" : "bg-[var(--fill)]"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-[var(--surface)] text-[var(--fg-muted)]">
              {p.origin === "claude" && <SparkleIcon size={12} />}
              {p.origin === "claude" ? s.draftedFromConversation : s.enteredByNavigator}
            </span>
            <span className="text-[17px] font-semibold">{shown ? <Highlighted text={shown} lang="en" /> : "—"}</span>
          </div>
          {p.math && numbersOk && <p className="text-[13px] text-[var(--fg-muted)]">{p.math}</p>}
          <Provenance origin={p.origin} quote={p.quote} s={s} />
          {!numbersOk ? (
            <p className="flex items-start gap-1.5 text-[13px] font-medium text-[var(--danger)]">
              <AlertIcon size={14} className="mt-0.5 shrink-0" /> {ASK.number_unverified}
            </p>
          ) : p.unclear ? (
            <p className="flex items-start gap-1.5 text-[13px] font-medium text-[var(--warn)]">
              <AlertIcon size={14} className="mt-0.5 shrink-0" /> {s.unclearAsk} {p.ask}
            </p>
          ) : (
            <>
              <p className="text-[13px] text-[var(--fg-muted)]">
                {s.neighborIsAsked}: <span className="italic">“{readbackToString(buildReadback(field, p.value, "en", labels.t))}”</span>
              </p>
              <p className={`text-[13px] font-medium ${fs.neighborAnswer === "yes" ? "text-[var(--accent)]" : "text-[var(--fg-muted)]"}`}>
                {fs.neighborAnswer === "yes" ? s.neighborSaidYes : s.waitingForNeighbor}
              </p>
            </>
          )}
          {p.unclear && <p className="text-[12px] text-[var(--fg-muted)]">{s.unclearFixHint}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!canConfirm(fs) || !numbersOk} onClick={() => dispatch({ type: "NAVIGATOR_CONFIRM", fieldId: field.id })} className="btn btn-sm btn-primary">
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

  if (!p && fs.rejected) {
    return (
      <div id={inputId} className="inset-box space-y-1 bg-[var(--danger-soft)]">
        <p className="text-[17px] font-semibold text-[var(--danger)]">{s.youSaidNo}</p>
        <p className="text-[15px]">{s.sayOrTypeAgain}</p>
      </div>
    );
  }

  if (!p) {
    const shown = fs.confirmed && confirmedNumbersOk(field, fs) ? displayValue(field, fs.value, lang, labels.t) : "";
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

  const numbersOk = pendingNumbersOk(field, p);
  // Guardrail 4: nothing to answer until the value is complete and its numbers check out.
  if (p.unclear || !numbersOk || p.value === "") {
    return (
      <div id={inputId} className="inset-box bg-[var(--fill)]">
        <p className="text-[15px] text-[var(--fg-muted)]">{s.navigatorWillAsk}</p>
      </div>
    );
  }

  const question = buildReadback(field, p.value, lang, labels.t);
  return (
    <div id={inputId} className="inset-box space-y-4 bg-[var(--surface)] shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      {/* The answer as a question, with the number and unit large and high-contrast. */}
      <p lang={lang} className="text-[22px] leading-snug text-[var(--fg)]">
        {question.map((seg, i) =>
          seg.emphasis ? (
            <strong key={i} className="text-[28px] font-bold text-[var(--fg)]">
              {seg.text}
            </strong>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
      <Provenance origin={p.origin} quote={p.quote} s={s} />
      {fs.neighborAnswer === "yes" ? (
        <p className="flex items-center gap-2 text-[17px] font-semibold text-[var(--accent)]">
          <CheckIcon size={18} /> {s.answeredYes}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => dispatch({ type: "NEIGHBOR_ANSWER", fieldId: field.id, answer: "yes" })}
            className="btn btn-primary !h-[52px] text-[19px] font-semibold"
          >
            {s.yes}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "NEIGHBOR_ANSWER", fieldId: field.id, answer: "no" })}
            className="btn !h-[52px] bg-[var(--danger)] text-[19px] font-semibold text-white"
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
  const commit = (force = false) => {
    if (force || v !== initial) onCommit(v);
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

  if (field.type === "money") return <MoneyInput id={id} initial={initial} onCommit={onCommit} onFocus={onFocus} />;

  const type = field.type === "number" ? "number" : field.type === "phone" ? "tel" : field.type;
  return (
    <input
      id={id}
      className="field"
      type={type}
      min={type === "number" ? 0 : undefined}
      inputMode={type === "number" ? "decimal" : undefined}
      value={v}
      onFocus={onFocus}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(true); // Enter re-sends even an unchanged value (e.g. to ask again after a "No")
        }
      }}
    />
  );
}

/**
 * Money is entered as stated: amount + how often. Nothing is converted.
 * Proposes once both parts are filled (on blur / Enter / choosing how often).
 */
function MoneyInput({ id, initial, onCommit, onFocus }: { id: string; initial: string; onCommit: (v: string) => void; onFocus: () => void }) {
  const start = parseMoney(initial);
  const [amount, setAmount] = useState(start ? String(start.amount) : "");
  const [period, setPeriod] = useState<Period | "">(start?.period ?? "");
  const commit = (a: string, p: Period | "", force = false) => {
    const n = Number(a);
    if (a.trim() === "" || !Number.isFinite(n) || n < 0 || !p) return;
    const v = encodeMoney(n, p);
    if (force || v !== initial) onCommit(v);
  };
  return (
    <div className="flex gap-2">
      <input
        id={id}
        className="field"
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        placeholder="Amount"
        value={amount}
        onFocus={onFocus}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={() => commit(amount, period)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(amount, period, true);
          }
        }}
      />
      <select
        aria-label="How often"
        className="field !w-auto"
        value={period}
        onFocus={onFocus}
        onChange={(e) => {
          const p = e.target.value as Period | "";
          setPeriod(p);
          commit(amount, p);
        }}
      >
        <option value="">How often…</option>
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABEL[p].en}
          </option>
        ))}
      </select>
    </div>
  );
}
