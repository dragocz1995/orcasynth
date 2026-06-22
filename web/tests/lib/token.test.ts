import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearToken, AUTH_CLEARED_EVENT } from '../../lib/token';

const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); fetchMock.mockResolvedValue(new Response('{}', { status: 200 })); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('clearToken', () => {
  it('asks the proxy to expire the cookie and fires AUTH_CLEARED_EVENT', () => {
    const fired = vi.fn();
    window.addEventListener(AUTH_CLEARED_EVENT, fired);
    clearToken();
    window.removeEventListener(AUTH_CLEARED_EVENT, fired);

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    expect(fired).toHaveBeenCalledOnce();
  });

  it('still fires the event when the logout request rejects (daemon down)', () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const fired = vi.fn();
    window.addEventListener(AUTH_CLEARED_EVENT, fired);
    clearToken();
    window.removeEventListener(AUTH_CLEARED_EVENT, fired);

    expect(fired).toHaveBeenCalledOnce();
  });
});
