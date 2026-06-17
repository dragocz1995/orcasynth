'use client';
export const dynamic = 'force-dynamic';
import { KanbanSquare } from 'lucide-react';
import { useTasks } from '../../lib/queries';
import { useSetTaskStatus } from '../../lib/mutations';
import { KanbanBoard } from '../../modules/kanban/KanbanBoard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Section } from '../../components/ui/Section';
import { LoadingState, ErrorState } from '../../components/ui/states';
import { ModuleShell } from '../../components/shell/ModuleShell';
import { useToast } from '../../components/ui/Toast';

export default function KanbanPage() {
  const tasks = useTasks();
  const setStatus = useSetTaskStatus();
  const { toast } = useToast();
  return (
    <ModuleShell moduleId="kanban">
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Kanban" count={tasks.data?.length} />
        <Section title="Board" icon={KanbanSquare}>
          {tasks.isLoading ? <LoadingState /> : tasks.isError ? <ErrorState message="orca daemon unreachable" onRetry={() => tasks.refetch()} />
            : (
              <KanbanBoard
                tasks={tasks.data ?? []}
                onMove={(id, status) => setStatus.mutate({ id, status }, { onError: (e) => toast(String(e), 'error') })}
              />
            )}
        </Section>
      </div>
    </ModuleShell>
  );
}
