import { forwardRef, type InputHTMLAttributes } from 'react';

const BASE = 'h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    const extra = className.trim();
    return <input ref={ref} className={`${BASE}${extra ? ` ${extra}` : ''}`} {...rest} />;
  },
);
