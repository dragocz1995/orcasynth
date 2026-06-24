import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RANGE, RANGE_PRESETS, serializeRange, parseRange, isStoredRange, rangeBounds, inRange,
} from '../../../modules/timeline/dateRange';

describe('timeline/dateRange', () => {
  it('defaults to the last 7 days', () => {
    expect(DEFAULT_RANGE).toEqual({ preset: '7d' });
  });

  it('serialize/parse round-trips every preset', () => {
    for (const preset of RANGE_PRESETS) {
      const r = { preset };
      expect(parseRange(serializeRange(r))).toEqual(r);
    }
  });

  it('rejects malformed stored values, accepts valid ones', () => {
    expect(parseRange('garbage')).toBeNull();
    expect(parseRange('custom')).toBeNull();
    expect(parseRange('90d')).toBeNull();
    expect(parseRange('')).toBeNull();
    expect(isStoredRange('7d')).toBe(true);
    expect(isStoredRange('30d')).toBe(true);
    expect(isStoredRange('all')).toBe(true);
    expect(isStoredRange('nope')).toBe(false);
  });

  it("'all' spans everything", () => {
    const b = rangeBounds({ preset: 'all' }, new Date('2026-06-23T12:00:00').getTime());
    expect(b.fromMs).toBe(-Infinity);
    expect(b.toMs).toBe(Infinity);
  });

  it('last-7-days includes today and 6 days back, excludes 8 days ago', () => {
    const now = new Date('2026-06-23T12:00:00').getTime();
    const r = { preset: '7d' as const };
    expect(inRange(new Date('2026-06-23T09:00:00').getTime(), r, now)).toBe(true);  // today
    expect(inRange(new Date('2026-06-17T23:00:00').getTime(), r, now)).toBe(true);  // 6 days back
    expect(inRange(new Date('2026-06-15T12:00:00').getTime(), r, now)).toBe(false); // 8 days back
  });

  it('last-30-days includes today and 29 days back, excludes 31 days ago', () => {
    const now = new Date('2026-06-23T12:00:00').getTime();
    const r = { preset: '30d' as const };
    expect(inRange(new Date('2026-06-23T09:00:00').getTime(), r, now)).toBe(true);  // today
    expect(inRange(new Date('2026-05-25T23:00:00').getTime(), r, now)).toBe(true);  // 29 days back
    expect(inRange(new Date('2026-05-22T12:00:00').getTime(), r, now)).toBe(false); // 32 days back
  });

  it("'all' includes ancient and future timestamps", () => {
    const now = new Date('2026-06-23T12:00:00').getTime();
    const r = { preset: 'all' as const };
    expect(inRange(0, r, now)).toBe(true);
    expect(inRange(new Date('2050-01-01T00:00:00').getTime(), r, now)).toBe(true);
  });
});
