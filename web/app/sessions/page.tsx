'use client';
export const dynamic = 'force-dynamic';
import { useSessions } from '../../lib/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { ModuleShell } from '../../components/shell/ModuleShell';
import { SessionsView } from '../../modules/sessions/SessionsView';

export default function SessionsPage() {
  const sessions = useSessions();
  return (
    <ModuleShell moduleId="sessions">
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Sessions" count={sessions.data?.length} />
        <SessionsView />
      </div>
    </ModuleShell>
  );
}
