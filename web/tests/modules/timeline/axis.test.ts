import { describe, it, expect } from 'vitest';
import { plotAxis } from '../../../modules/timeline/axis';

const HOUR_MS = 3_600_000;
// Fixed "now": 2026-06-17T12:00:00Z
const NOW = Date.parse('2026-06-17T12:00:00Z');
const HOURS = 12;
const WINDOW_START = NOW - HOURS * HOUR_MS;

function makeEvent(id: string, offsetMs: number) {
  return { id, type: 'task', target: `t-${id}`, detail: 'open', timestamp: NOW - offsetMs };
}

describe('plotAxis', () => {
  it('always generates the requested number of ticks', () => {
    const { ticks } = plotAxis([], NOW, HOURS);
    expect(ticks).toHaveLength(HOURS);
  });

  it('tick labels are HH:MM formatted UTC strings', () => {
    const { ticks } = plotAxis([], NOW, HOURS);
    for (const tick of ticks) {
      expect(tick.label).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('tick fracs are monotonically increasing and in (0, 1]', () => {
    const { ticks } = plotAxis([], NOW, HOURS);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].frac).toBeGreaterThan(ticks[i - 1].frac);
    }
    expect(ticks[ticks.length - 1].frac).toBeCloseTo(1, 5);
  });

  it('maps an event at "now" to frac ≈ 1', () => {
    const { points } = plotAxis([makeEvent('a', 0)], NOW, HOURS);
    expect(points).toHaveLength(1);
    expect(points[0].frac).toBeCloseTo(1, 5);
  });

  it('maps an event at the start of the window to frac ≈ 0', () => {
    const event = { id: 'b', type: 'task', target: 't', detail: 'd', timestamp: WINDOW_START };
    const { points } = plotAxis([event], NOW, HOURS);
    expect(points).toHaveLength(1);
    expect(points[0].frac).toBeCloseTo(0, 5);
  });

  it('maps an event at the midpoint to frac ≈ 0.5', () => {
    const mid = { id: 'c', type: 'task', target: 't', detail: 'd', timestamp: WINDOW_START + (HOURS / 2) * HOUR_MS };
    const { points } = plotAxis([mid], NOW, HOURS);
    expect(points[0].frac).toBeCloseTo(0.5, 5);
  });

  it('drops events before the window', () => {
    const old = { id: 'd', type: 'task', target: 't', detail: 'd', timestamp: WINDOW_START - 1 };
    const { points } = plotAxis([old], NOW, HOURS);
    expect(points).toHaveLength(0);
  });

  it('drops events after now', () => {
    const future = { id: 'e', type: 'task', target: 't', detail: 'd', timestamp: NOW + 1 };
    const { points } = plotAxis([future], NOW, HOURS);
    expect(points).toHaveLength(0);
  });

  it('empty events → no points, ticks still present', () => {
    const { ticks, points } = plotAxis([], NOW, HOURS);
    expect(points).toHaveLength(0);
    expect(ticks).toHaveLength(HOURS);
  });

  it('preserves all event fields in the output point', () => {
    const e = { id: 'z', type: 'mission', target: 'my-target', detail: 'active', timestamp: NOW - HOUR_MS };
    const { points } = plotAxis([e], NOW, HOURS);
    expect(points[0]).toMatchObject({ id: 'z', type: 'mission', target: 'my-target', detail: 'active' });
  });
});
