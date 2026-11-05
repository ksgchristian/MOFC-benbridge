"use client";

import { ui } from "@/lib/i18n/ui";
import { displayValue } from "@/lib/forms/display";
import { YES_NO_LABELS, type FormField } from "@/lib/forms/schema";
import { useFormLabels } from "@/lib/forms/useFormLabels";
import { useSession } from "@/lib/session/SessionContext";
import type { Speaker } from "@/lib/session/types";
import { FlagButton } from "./FlagButton";

/**
 * The same application rendered for either side.
 * - navigator: English labels, editable inputs, sees confirmation status.
 * - neighbor: labels in their language, read-only values, Confirm per field.
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

function FieldRow({
  field,
  viewer,
  labels,
}: {
  field: FormField;
  viewer: Speaker;
  labels: ReturnType<typeof useFormLabels>;
}) {
  const { state, dispatch, langFor, addFlag } = useSession();
  const lang = langFor(viewer);
  const s = ui(lang);
  const fs = state.fields[field.id];
  const value = fs?.value ?? "";
  const labelKey = `field.${field.id}.label`;
  const label = labels.t(labelKey, field.label);
  const help = labels.t(`field.${field.id}.help`, field.help);
  const machine = labels.isMachine(labelKey);
  const inputId = `${viewer}-${field.id}`;

  const status = value.trim() === "" ? null : fs?.confirmed ? "confirmed" : "pending";

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <label htmlFor={inputId} className="text-sm">
          {label}
          {field.required && <span className="text-red-600"> *</span>}
          {machine && <span className="ml-1 rounded bg-[var(--muted)] px-1 text-[10px] uppercase text-[var(--fg-muted)]">AI</span>}
        </label>
        {viewer === "neighbor" && lang !== "en" && (
          <FlagButton
            strings={s}
            onFlag={(note) => addFlag(viewer, { kind: "field", fieldId: field.id }, field.label.en, label, note)}
          />
        )}
      </div>
      {help && <p className="text-xs text-[var(--fg-muted)]">{help}</p>}

      {viewer === "navigator" ? (
        <div className="flex items-center gap-2">
          <FieldInput id={inputId} field={field} value={value} onChange={(v) => dispatch({ type: "SET_FIELD", fieldId: field.id, value: v })} />
          <StatusBadge status={status} strings={s} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <output id={inputId} className="min-h-9 flex-1 rounded-md bg-[var(--muted)] px-3 py-2 text-sm">
            {displayValue(field, value, lang, labels.t) || s.empty}
          </output>
          {status && (
            <button
              type="button"
              onClick={() => dispatch({ type: "CONFIRM_FIELD", fieldId: field.id, confirmed: !fs?.confirmed })}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
                fs?.confirmed ? "bg-green-600 text-white" : "border border-green-600 text-green-700 dark:text-green-400"
              }`}
            >
              {fs?.confirmed ? `✓ ${s.confirmed}` : s.confirm}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, strings }: { status: "confirmed" | "pending" | null; strings: ReturnType<typeof ui> }) {
  if (!status) return null;
  return status === "confirmed" ? (
    <span className="shrink-0 text-xs text-green-700 dark:text-green-400">✓ {strings.confirmed}</span>
  ) : (
    <span className="shrink-0 text-xs text-[var(--fg-muted)]">{strings.notConfirmed}</span>
  );
}

const inputClass = "min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm";

function FieldInput({ id, field, value, onChange }: { id: string; field: FormField; value: string; onChange: (v: string) => void }) {
  switch (field.type) {
    case "select":
      return (
        <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label.en}
            </option>
          ))}
        </select>
      );
    case "yesno":
      return (
        <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          <option value="yes">{YES_NO_LABELS.yes.en}</option>
          <option value="no">{YES_NO_LABELS.no.en}</option>
        </select>
      );
    case "money":
    case "number":
      return (
        <input
          id={id}
          className={inputClass}
          type="number"
          min={0}
          step={field.type === "money" ? "0.01" : "1"}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "date":
      return <input id={id} className={inputClass} type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "phone":
      return <input id={id} className={inputClass} type="tel" value={value} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input id={id} className={inputClass} type="text" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}
