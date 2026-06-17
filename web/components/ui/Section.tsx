import type { ReactNode } from 'react';

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-none" style={{ boxShadow: 'var(--shadow-card)' }}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <h2 className="font-mono uppercase tracking-widest text-text-muted" style={{ fontSize: 'var(--text-caption)' }}>{title}</h2>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
