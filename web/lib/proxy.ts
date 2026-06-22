// Server-side BFF proxy helpers. The browser only ever talks to this web origin; these helpers let
// the route handlers translate the httpOnly session cookie into a daemon bearer token, guard against
// cross-origin (CSRF) writes, and forward request headers cleanly. None of this runs in the browser.
export const COOKIE_NAME = 'orca_session';

export function daemonUrl(): string {
  return process.env.ORCA_DAEMON_URL ?? 'http://localhost:4400';
}

const ATTRS = 'HttpOnly; Secure; SameSite=Lax; Path=/';

export function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; ${ATTRS}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; ${ATTRS}; Max-Age=0`;
}

/** Same-origin guard for mutating requests (CSRF defense-in-depth on top of SameSite=Lax).
 *  A missing Origin header (same-origin GET navigations, some same-origin fetches) is allowed;
 *  a present Origin must equal our own origin. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (origin == null) return true;
  return origin === new URL(req.url).origin;
}

/** Copy request headers for forwarding to the daemon, dropping hop-by-hop / identity headers that
 *  must not leak (the browser cookie carries our session, not the daemon's auth). */
export function forwardHeaders(req: Request): Headers {
  const h = new Headers(req.headers);
  h.delete('cookie');
  h.delete('host');
  h.delete('connection');
  return h;
}
