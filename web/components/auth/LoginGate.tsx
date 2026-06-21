'use client';
// Auth gate. A stored token opens the shell immediately (fast first paint), but it is NOT trusted
// blindly: a background `me()` validates it, and ANY 401 (from that check or a later query) clears
// the token and fires AUTH_CLEARED_EVENT — which flips us straight to the login form and drops cached
// data. So a stale/expired/deleted-user token can no longer strand the user in a broken shell.
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getToken, AUTH_CLEARED_EVENT } from '../../lib/token';
import { orcaClient } from '../../lib/orcaClient';
import { EventBridge } from '../../app/providers';
import { LoginForm } from './LoginForm';

type Gate = 'checking' | 'login' | 'open';

export function LoginGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>('checking');
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  useEffect(() => {
    let alive = true;
    if (getToken() != null) {
      // Open right away so the shell paints, then verify in the background. me()'s 401 path clears the
      // token and fires AUTH_CLEARED_EVENT (handled below); a transient/network error is ignored so a
      // briefly-unreachable daemon doesn't log a valid session out.
      setGate('open');
      void orcaClient.me().catch(() => { /* 401 handled via AUTH_CLEARED_EVENT; transient errors kept */ });
      return () => { alive = false; };
    }
    // No token: a brand-new install (no users yet) shows onboarding without a login; a configured
    // instance shows the login form.
    orcaClient.setupStatus()
      .then((s) => {
        if (!alive) return;
        if (s.needsSetup) { setGate('open'); if (pathname !== '/onboarding') router.replace('/onboarding'); }
        else setGate('login');
      })
      .catch(() => { if (alive) setGate('login'); });
    return () => { alive = false; };
  }, [pathname, router]);

  // Token dropped (stale-token validation 401, mid-session 401, or explicit logout): go to login with
  // no reload, and clear the cache so a re-login can never flash the previous user's data.
  useEffect(() => {
    const onCleared = () => { qc.clear(); setGate('login'); };
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
  }, [qc]);

  if (gate === 'checking') return null;
  if (gate === 'login') return <LoginForm onAuthed={() => setGate('open')} />;

  return (
    <>
      <EventBridge />
      {children}
    </>
  );
}
