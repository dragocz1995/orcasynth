'use client';
import { useTranslation } from '../../lib/i18n';

/** Segmented capacity meter for an autopilot mission: one segment per max-sessions slot,
 *  filled (accent) for each live running phase, empty (border) for the slots still free.
 *  Flat — no gradients, no glows. Shows "running/max" alongside the segments. */
export function CapacityMeter({ running, max, className = '' }: { running: number; max: number; className?: string }) {
  const { t } = useTranslation();
  const segments = Math.max(0, Math.floor(max));
  const filled = Math.min(running, segments);
  const label = t.missions.capacityUsed.replace('{running}', String(filled)).replace('{max}', String(segments));
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="meter"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={segments}
      aria-label={label}
      title={label}
    >
      {segments > 0 ? (
        <span className="flex h-1.5 gap-0.5" aria-hidden>
          {Array.from({ length: segments }, (_, i) => (
            <span
              key={i}
              className={`h-full w-2 rounded-full transition-colors ${i < filled ? 'bg-accent' : 'bg-border'}`}
              style={{ transitionDuration: 'var(--motion-base)' }}
            />
          ))}
        </span>
      ) : null}
      <span className="font-mono text-[11px] tabular-nums text-text-muted">{filled}/{segments}</span>
    </span>
  );
}