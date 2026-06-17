import type { ReactNode } from 'react';

/** Label + control wrapper for modal/forms. Keeps spacing and label styling consistent. */
export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}
