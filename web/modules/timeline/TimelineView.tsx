'use client';
import { useState } from 'react';
import { useActivity } from '../../lib/queries';
import { plotAxis } from './axis';
import { eventIcon, eventTone } from './eventMeta';
import { Button } from '../../components/ui/Button';
import { Section } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/states';

const FILTER_OPTIONS: { label: string; value: string | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Tasks', value: 'task' },
  { label: 'Missions', value: 'mission' },
  { label: 'Signals', value: 'signal' },
];

const WINDOW_HOURS = 12;

/** Parse either ISO ("2026-06-17T12:05:00Z") or SQLite ("2026-06-17 12:05:00") ts → epoch ms. */
function parseTs(ts: string): number {
  const iso = ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z';
  return Date.parse(iso);
}

export function TimelineView() {
  const [type, setType] = useState<string | undefined>(undefined);
  const q = useActivity(type);

  const rawEvents = (q.data ?? []).flatMap((e) => {
    const t = parseTs(e.ts);
    if (Number.isNaN(t)) return [];
    return [{ id: String(e.id), type: e.type, target: e.target, detail: e.detail, timestamp: t }];
  });

  const { ticks, points } = plotAxis(rawEvents, Date.now(), WINDOW_HOURS);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.label}
            variant={type === opt.value ? 'accent' : 'default'}
            onClick={() => setType(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Horizontal timeline axis */}
      <Section title="Activity / last 12h">
        <div className="relative w-full select-none">
          {/* Track */}
          <div className="relative h-8">
            {/* Baseline */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-border -translate-y-1/2" />
            {/* Event dots */}
            {points.map((p) => {
              const tone = eventTone(p.type);
              const dotColor =
                tone === 'accent'
                  ? 'bg-accent'
                  : tone === 'danger'
                  ? 'bg-danger'
                  : 'bg-text-muted';
              const label = new Date(p.timestamp).toUTCString().slice(17, 22);
              return (
                <div
                  key={p.id}
                  data-testid="axis-dot"
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${dotColor} border border-surface cursor-default`}
                  style={{ left: `${p.frac * 100}%` }}
                  title={`${p.target} — ${p.detail} (${label})`}
                />
              );
            })}
          </div>

          {/* Tick labels */}
          <div className="relative h-4 mt-1">
            {ticks.map((tick) => (
              <span
                key={tick.label}
                data-testid="axis-tick"
                className="absolute -translate-x-1/2 font-mono text-text-muted"
                style={{ left: `${tick.frac * 100}%`, fontSize: 'var(--text-caption)' }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* Activity feed */}
      <Section title="Activity">
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState message="Failed to load activity" onRetry={() => q.refetch()} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {q.data.map((e) => {
              const Icon = eventIcon(e.type);
              const tone = eventTone(e.type);
              return (
                <div key={e.id} className="flex items-center gap-3 py-2">
                  <Icon className="shrink-0 text-text-muted" size={14} />
                  <span className="font-mono text-xs flex-1">{e.target}</span>
                  <Badge tone={tone}>{e.detail}</Badge>
                  <span className="text-text-muted text-xs whitespace-nowrap">{e.ts}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
