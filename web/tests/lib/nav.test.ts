import { describe, it, expect } from 'vitest';
import { NAV_GROUPS } from '../../lib/nav';

describe('NAV_GROUPS', () => {
  it('has Operate (4 items) and Config (Settings)', () => {
    const operate = NAV_GROUPS.find((g) => g.label === 'Operate');
    const config = NAV_GROUPS.find((g) => g.label === 'Config');
    expect(operate?.items.map((i) => i.href)).toEqual(['/dash', '/tasks', '/sessions', '/missions']);
    expect(config?.items.map((i) => i.href)).toEqual(['/settings']);
    for (const g of NAV_GROUPS) for (const i of g.items) expect(typeof i.icon).not.toBe('undefined');
  });
});
