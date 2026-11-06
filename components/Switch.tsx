"use client";

/**
 * iOS-style on/off switch. It's a real checkbox underneath (role="switch"),
 * so keyboards and screen readers work as expected.
 */
export function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="relative inline-flex h-[31px] w-[51px] shrink-0">
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[var(--fill-strong)] transition-colors peer-checked:bg-[var(--accent)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]"
      />
      <span
        aria-hidden
        className="absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform peer-checked:translate-x-[20px]"
      />
    </span>
  );
}
