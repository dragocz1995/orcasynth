'use client';
import { useState } from 'react';
import { Plus, ListChecks } from 'lucide-react';
import type { Task } from '../../lib/types';
import { useTasks } from '../../lib/queries';
import { Button } from '../../components/ui/Button';
import { Section } from '../../components/ui/Section';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/states';
import { TaskRow } from './TaskRow';
import { TaskModal } from './TaskModal';

export function TasksView() {
  const tasks = useTasks();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  return (
    <>
      <Section
        title="Tasks"
        icon={ListChecks}
        actions={<Button variant="accent" icon={Plus} onClick={() => setCreating(true)}>New task</Button>}
      >
        {tasks.isLoading ? <LoadingState />
          : tasks.isError ? <ErrorState message="orca daemon unreachable" onRetry={() => tasks.refetch()} />
          : tasks.data && tasks.data.length > 0 ? (
            <div className="flex flex-col divide-y divide-border">
              {tasks.data.map((t) => <TaskRow key={t.id} task={t} onEdit={setEditing} />)}
            </div>
          ) : <EmptyState title="No tasks" description="Create one to get started." />}
      </Section>

      {creating && <TaskModal onClose={() => setCreating(false)} />}
      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
