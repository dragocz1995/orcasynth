import webpush from 'web-push';
import type { ConfigStore } from '../store/configStore.js';
import { logger } from '../shared/logger.js';

const log = logger('push-vapid');

/** Return the persisted VAPID keypair, generating + persisting one on first call. Idempotent: once a
 *  keypair exists it is reused (rotating it would invalidate every stored push subscription), so this
 *  is safe to call on every boot. The private key stays in the config store, never exposed via the API. */
export function ensureVapidKeys(config: ConfigStore): { publicKey: string; privateKey: string } {
  const existing = config.webPushKeys();
  if (existing) return existing;
  const keys = webpush.generateVAPIDKeys();
  config.setWebPushKeys(keys);
  log.info('generated VAPID keypair for web push');
  return keys;
}
