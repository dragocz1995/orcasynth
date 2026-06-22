import { describe, it, expect } from 'vitest';
import { update } from '../../src/cli/update.js';

const registry = (version: string) => (async () => new Response(JSON.stringify({ version }), { status: 200 })) as unknown as typeof fetch;

describe('cli/update.update', () => {
  it('does nothing when already on the latest version', async () => {
    let installed = false;
    const r = await update({} as NodeJS.ProcessEnv, { current: '1.2.0', fetch: registry('1.2.0'), install: async () => { installed = true; }, restart: async () => {} });
    expect(r).toEqual({ updated: false, from: '1.2.0', to: '1.2.0' });
    expect(installed).toBe(false);
  });
  it('installs and restarts when a newer version exists', async () => {
    const order: string[] = [];
    const r = await update({} as NodeJS.ProcessEnv, {
      current: '1.2.0', fetch: registry('1.3.0'),
      install: async () => { order.push('install'); },
      restart: async () => { order.push('restart'); },
    });
    expect(r).toEqual({ updated: true, from: '1.2.0', to: '1.3.0' });
    expect(order).toEqual(['install', 'restart']);
  });
});
