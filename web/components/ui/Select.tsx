import type { SelectHTMLAttributes } from 'react';

const BASE = 'h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text transition-colors focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const extra = className.trim();
  return (
    <select className={`${BASE}${extra ? ` ${extra}` : ''}`} {...rest}>
      {children}
    </select>
  );
}
