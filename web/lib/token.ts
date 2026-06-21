const KEY = 'orca.token';

/** Event fired whenever the stored token is dropped (a 401 from a stale/expired/deleted-user token,
 *  or an explicit logout). The auth gate listens for it to flip straight to the login form instead
 *  of stranding the user in a logged-in-but-broken shell. */
export const AUTH_CLEARED_EVENT = 'orca:auth-cleared';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY);
}
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, token);
}
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
}
export function withToken(url: string): string {
  const token = getToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}
