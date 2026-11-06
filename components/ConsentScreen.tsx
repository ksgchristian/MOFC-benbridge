"use client";

import { consent, type ConsentText } from "@/lib/glossary/consent";
import { bothAgreed } from "@/lib/session/reducer";
import { useSession } from "@/lib/session/SessionContext";
import type { SessionPrefs, Speaker } from "@/lib/session/types";
import { CheckIcon } from "./Icons";
import { Switch } from "./Switch";

/**
 * Privacy and agreement screen, shown before every session (page load and
 * after End session). Written mainly for the neighbor in Spanish, with short
 * English for the navigator. Nothing here is saved.
 */
export function ConsentScreen() {
  const { state, dispatch } = useSession();
  const ready = bothAgreed(state);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8 px-5 pb-16 pt-10">
        {/* 1. Title */}
        <header className="space-y-3">
          <h1 lang="es" className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em]">
            {consent.title.es}
          </h1>
          <p lang="en" className="text-[15px] text-[var(--fg-muted)]">{consent.title.en}</p>
          <p lang="es" className="text-[19px] leading-snug">{consent.subtitle.es}</p>
        </header>

        {/* 2. Choices */}
        <section>
          <SectionTitle text={consent.choicesHeading} />
          <div className="card hairline overflow-hidden">
            <PrefRow pref="voice" label={consent.voiceLabel} caption={consent.voiceCaption} />
            <PrefRow pref="readAloud" label={consent.readAloudLabel} caption={consent.readAloudCaption} />
          </div>
        </section>

        {/* 3. What always happens (information, not toggles) */}
        <section>
          <SectionTitle text={consent.alwaysHeading} />
          <ul className="card hairline overflow-hidden">
            {consent.always.map((t, i) => (
              <li key={i} className="flex gap-3 px-4 py-3.5">
                <CheckIcon size={20} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <div className="space-y-0.5">
                  <p lang="es" className="text-[17px] leading-snug">{t.es}</p>
                  <p lang="en" className="text-[13px] leading-snug text-[var(--fg-muted)]">{t.en}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Agreement */}
        <section>
          <SectionTitle text={consent.agreeHeading} />
          <div className="card hairline overflow-hidden">
            <AgreeRow who="neighbor" name={consent.neighborName} agree={consent.neighborAgree} agreed={consent.neighborAgreed} primary="es" />
            <AgreeRow who="navigator" name={consent.navigatorName} agree={consent.navigatorAgree} agreed={consent.navigatorAgreed} primary="en" />
          </div>
        </section>

        {/* 5. Start */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={!ready}
            onClick={() => dispatch({ type: "START_SESSION" })}
            className="btn btn-lg btn-primary w-full"
          >
            {consent.start.es} · {consent.start.en}
          </button>
          {!ready && (
            <p className="text-center text-[13px] text-[var(--fg-muted)]">
              <span lang="es">{consent.startHint.es}</span> · <span lang="en">{consent.startHint.en}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ text }: { text: ConsentText }) {
  return (
    <h2 className="px-1 pb-2 text-[13px] text-[var(--fg-muted)]">
      <span lang="es" className="font-semibold text-[var(--fg)]">{text.es}</span> · <span lang="en">{text.en}</span>
    </h2>
  );
}

function PrefRow({ pref, label, caption }: { pref: keyof SessionPrefs; label: ConsentText; caption: ConsentText }) {
  const { state, dispatch } = useSession();
  const id = `pref-${pref}`;
  return (
    <div className="flex items-start gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={id} className="block">
          <span lang="es" className="text-[17px] font-semibold">{label.es}</span>
          <span lang="en" className="text-[13px] text-[var(--fg-muted)]"> · {label.en}</span>
        </label>
        <p lang="es" className="text-[15px] leading-snug text-[var(--fg-muted)]">{caption.es}</p>
        <p lang="en" className="text-[13px] leading-snug text-[var(--fg-muted)]">{caption.en}</p>
      </div>
      <Switch
        id={id}
        label={`${label.es} · ${label.en}`}
        checked={state.prefs[pref]}
        onChange={(value) => dispatch({ type: "SET_PREF", pref, value })}
      />
    </div>
  );
}

function AgreeRow({
  who,
  name,
  agree,
  agreed,
  primary,
}: {
  who: Speaker;
  name: ConsentText;
  agree: ConsentText;
  agreed: ConsentText;
  primary: "es" | "en";
}) {
  const { state, dispatch } = useSession();
  const on = state.agreed[who];
  const secondary = primary === "es" ? "en" : "es";
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span lang={primary} className="text-[17px] font-semibold">{name[primary]}</span>
        <span lang={secondary} className="text-[13px] text-[var(--fg-muted)]"> · {name[secondary]}</span>
      </span>
      <button
        type="button"
        aria-pressed={on}
        onClick={() => dispatch({ type: "SET_AGREEMENT", who, agreed: !on })}
        className={`btn min-h-[44px] min-w-[132px] ${on ? "btn-primary" : "btn-tinted"}`}
      >
        {on && <CheckIcon size={16} />}
        <span lang={primary}>{on ? agreed[primary] : agree[primary]}</span>
        {primary === "en" ? null : <span lang="en" className="sr-only"> ({on ? agreed.en : agree.en})</span>}
      </button>
    </div>
  );
}
