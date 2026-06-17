import type { ReactNode } from 'react';

type Tone = 'default' | 'accent' | 'muted';
const TONES: Record<Tone, string> = {
  default: 'border-border text-text',
  accent: 'border-accent text-accent',
  muted: 'border-border text-text-muted',
};

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-block border rounded-none px-1.5 py-0.5 font-mono text-xs uppercase ${TONES[tone]}`}>{children}</span>;
}
