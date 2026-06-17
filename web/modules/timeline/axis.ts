const HOUR_MS = 3_600_000;

export interface AxisEvent {
  id: string;
  type: string;
  target: string;
  detail: string;
  timestamp: number;
}

export interface AxisPoint extends AxisEvent {
  frac: number;
}

export interface AxisTick {
  label: string;
  frac: number;
}

export interface AxisResult {
  ticks: AxisTick[];
  points: AxisPoint[];
}

/**
 * Map a list of events onto a horizontal time axis.
 *
 * @param events  Raw event list with numeric `timestamp` (epoch ms).
 * @param now     Current epoch ms (injected so callers can test deterministically).
 * @param hours   Width of the window in hours.
 * @returns       `ticks` — one per hour from oldest to newest;
 *                `points` — events inside the window with their X fraction.
 */
export function plotAxis(
  events: Array<{ id: string; type: string; target: string; detail: string; timestamp: number }>,
  now: number,
  hours: number,
): AxisResult {
  const windowStart = now - hours * HOUR_MS;

  // Build ticks: one per hour, from oldest to newest.
  const ticks: AxisTick[] = Array.from({ length: hours }, (_, i) => {
    const tickMs = windowStart + (i + 1) * HOUR_MS;
    const d = new Date(tickMs);
    const label = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    const frac = (tickMs - windowStart) / (now - windowStart);
    return { label, frac };
  });

  // Map events to X fractions; drop anything outside [windowStart, now].
  const points: AxisPoint[] = events
    .filter((e) => e.timestamp >= windowStart && e.timestamp <= now)
    .map((e) => ({
      ...e,
      frac: (e.timestamp - windowStart) / (now - windowStart),
    }));

  return { ticks, points };
}
