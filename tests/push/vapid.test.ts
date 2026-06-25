import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../../src/store/db.js';
import { ConfigStore } from '../../src/store/configStore.js';
import { ensureVapidKeys } from '../../src/push/vapid.js';

describe('ensureVapidKeys', () => {
  let config: ConfigStore;
  beforeEach(() => { config = new ConfigStore(openDb(':memory:')); });

  it('generates and persists a keypair on first call', () => {
    expect(config.webPushKeys()).toBeNull();
    const keys = ensureVapidKeys(config);
    expect(keys.publicKey.length).toBeGreaterThan(0);
    expect(keys.privateKey.length).toBeGreaterThan(0);
    expect(config.webPushKeys()).toEqual(keys);
  });

  it('is idempotent — a second call returns the same keypair (no rotation)', () => {
    const first = ensureVapidKeys(config);
    const second = ensureVapidKeys(config);
    expect(second).toEqual(first);
  });
});
