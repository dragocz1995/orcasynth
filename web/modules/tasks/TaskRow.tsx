'use client';
import { useState } from 'react';
import { Pencil, Play, Archive, Trash2 } from 'lucide-react';
import type { Task } from '../../lib/types';
import { useSpawn, useCloseTask, useDeleteTask } from '../../lib/mutations';
import { taskExec } from '../../lib/taskExec';
import { Badge } from '../../components/ui/Badge';
import { IconButton } from '../../components/ui/IconButton';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { taskTypeMeta } from './taskMeta';

export function TaskRow({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const spawn = useSpawn();
  const close = useCloseTask();
  const del = useDeleteTask();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meta = taskTypeMeta(task.type);
  const Icon = meta.icon;
  const exec = taskExec(task.labels);

  return (
    <div className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Icon size={16} className="shrink-0 text-text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text">{task.title}</div>
        <div className="font-mono text-[11px] text-text-muted">{task.id}</div>
      </div>
      {exec ? <Badge>{exec}</Badge> : null}
      <Badge tone={task.status === 'in_progress' ? 'accent' : 'default'}>{task.status}</Badge>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <IconButton icon={Pencil} label="Edit" onClick={() => onEdit(task)} />
        <IconButton icon={Play} label="Launch" onClick={() => spawn.mutate({ taskId: task.id, exec: exec || undefined }, { onSuccess: (r) => toast(`Launched ${r.session}`), onError: (e) => toast(String(e), 'error') })} />
        <ActionMenu
          label="Delete or close"
          items={[
            { label: 'Close (archive)', icon: Archive, onSelect: () => close.mutate(task.id, { onSuccess: () => toast(`Closed ${task.id}`), onError: (e) => toast(String(e), 'error') }) },
            { label: 'Delete permanently', icon: Trash2, tone: 'danger', onSelect: () => setConfirmDelete(true) },
          ]}
        />
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${task.id}?`}
        description="This permanently removes the task and its dependency links."
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); del.mutate(task.id, { onSuccess: () => toast(`Deleted ${task.id}`), onError: (e) => toast(String(e), 'error') }); }}
      />
    </div>
  );
}
