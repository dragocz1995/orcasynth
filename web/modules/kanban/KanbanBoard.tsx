'use client';
import type { Task, TaskStatus } from '../../lib/types';
import { Badge } from '../../components/ui/Badge';
import { statusTone } from '../dashboard/statusTone';
import { groupByStatus } from './groupByStatus';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'blocked', label: 'Blocked' },
  { status: 'closed', label: 'Closed' },
  { status: 'cancelled', label: 'Cancelled' },
];

export function KanbanBoard({ tasks, onMove }: { tasks: Task[]; onMove: (taskId: string, status: TaskStatus) => void }) {
  const groups = groupByStatus(tasks);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return (
    <div className="flex gap-3 overflow-x-auto">
      {COLUMNS.map((col) => (
        <div
          key={col.status}
          data-testid={`column-${col.status}`}
          className="flex min-w-[14rem] flex-1 flex-col gap-2 border border-border bg-surface p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            if (id && byId.get(id)?.status !== col.status) onMove(id, col.status);
          }}
        >
          <header className="flex items-center justify-between px-1 font-mono uppercase tracking-widest text-text-muted" style={{ fontSize: 'var(--text-caption)' }}>
            <span>{col.label}</span>
            <span>{groups[col.status].length}</span>
          </header>
          {groups[col.status].map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
              className="flex cursor-grab flex-col gap-1 border border-border bg-bg p-2"
            >
              <span className="text-sm text-text">{task.title}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-text-muted">{task.id}</span>
                <Badge tone={statusTone(task.status)}>{task.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
