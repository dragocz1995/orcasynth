'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { TerminalSquare } from 'lucide-react';
import { useSessions } from '../../lib/queries';
import { Section } from '../../components/ui/Section';
import { Modal } from '../../components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/states';
import { SessionCard } from './SessionCard';

// xterm references browser-only `self`; skip SSR to avoid prerender errors
const TerminalPanel = dynamic(
  () => import('../../components/terminal/TerminalPanel').then((m) => m.TerminalPanel),
  { ssr: false },
);

export function SessionsView() {
  const sessions = useSessions();
  const [openTerm, setOpenTerm] = useState<string | null>(null);

  return (
    <>
      <Section title="Sessions" icon={TerminalSquare}>
        {sessions.isLoading ? <LoadingState />
          : sessions.isError ? <ErrorState message="orca daemon unreachable" onRetry={() => sessions.refetch()} />
          : sessions.data && sessions.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sessions.data.map((s) => <SessionCard key={s} name={s} onOpenTerminal={() => setOpenTerm(s)} />)}
            </div>
          ) : <EmptyState title="No live sessions" description="Launch a task to spawn one." />}
      </Section>

      {openTerm && (
        <Modal title={`Terminal — ${openTerm}`} onClose={() => setOpenTerm(null)}>
          <TerminalPanel name={openTerm} onKilled={() => setOpenTerm(null)} />
        </Modal>
      )}
    </>
  );
}
