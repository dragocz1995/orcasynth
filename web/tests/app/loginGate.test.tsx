import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { onUnhandledRequest } from '../msw';
vi.mock('next/navigation', () => ({ usePathname: () => '/dash', useRouter: () => ({ push: () => {}, replace: () => {} }), useSearchParams: () => new URLSearchParams() }));
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../../lib/i18n';
import { ToastProvider } from '../../components/ui/Toast';
import { LoginGate } from '../../components/auth/LoginGate';
import { AUTH_CLEARED_EVENT } from '../../lib/token';

function Wrap({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <ToastProvider>{children}</ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

// EventBridge (rendered when the gate is open) opens an SSE stream; stub EventSource so jsdom doesn't choke.
class FakeES { onmessage = null; addEventListener() {} close() {} constructor(public url: string) {} }
(globalThis as unknown as { EventSource: typeof FakeES }).EventSource = FakeES;

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); });
afterAll(() => server.close());

const passwordInput = () => document.querySelector('input[type="password"]');

describe('LoginGate', () => {
  it('flips a stale token to the login form (and drops it) when /auth/me 401s', async () => {
    // A leftover token from a deleted/expired user — the daemon rejects it.
    localStorage.setItem('orca.token', 'stale-token');
    server.use(http.get('http://localhost:4400/auth/me', () => new HttpResponse(null, { status: 401 })));

    render(<Wrap><LoginGate><span>secret-content</span></LoginGate></Wrap>);

    // The background validation 401 clears the token and routes to the login form.
    await waitFor(() => expect(passwordInput()).toBeTruthy());
    expect(screen.queryByText('secret-content')).toBeNull();
    expect(localStorage.getItem('orca.token')).toBeNull(); // dropped, not left dangling
  });

  it('flips to login when an AUTH_CLEARED_EVENT fires mid-session (no reload)', async () => {
    localStorage.setItem('orca.token', 'valid-token');
    server.use(http.get('http://localhost:4400/auth/me', () => HttpResponse.json({ user: { id: 1, username: 'admin' } })));

    render(<Wrap><LoginGate><span>secret-content</span></LoginGate></Wrap>);
    // Valid token → shell content shows.
    await waitFor(() => expect(screen.getByText('secret-content')).toBeInTheDocument());

    // A later 401 elsewhere clears the token and dispatches the event; the gate must react.
    window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
    await waitFor(() => expect(passwordInput()).toBeTruthy());
    expect(screen.queryByText('secret-content')).toBeNull();
  });
});
