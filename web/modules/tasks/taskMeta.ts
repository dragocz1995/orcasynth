import { ListChecks, Bug, Sparkles, Layers, Wrench, Circle, type LucideIcon } from 'lucide-react';
import type { Tone } from '../../components/ui/tone';

export interface TaskTypeMeta { icon: LucideIcon; label: string; tone: Tone }

const MAP: Record<string, TaskTypeMeta> = {
  task: { icon: ListChecks, label: 'Task', tone: 'default' },
  bug: { icon: Bug, label: 'Bug', tone: 'danger' },
  feature: { icon: Sparkles, label: 'Feature', tone: 'accent' },
  epic: { icon: Layers, label: 'Epic', tone: 'accent' },
  chore: { icon: Wrench, label: 'Chore', tone: 'muted' },
};

/** Icon + label + tone for a task type. Unknown types fall back to a neutral circle. */
export function taskTypeMeta(type?: string): TaskTypeMeta {
  return MAP[type ?? 'task'] ?? { icon: Circle, label: type ?? 'Task', tone: 'default' };
}

export const TASK_TYPES = ['task', 'feature', 'bug', 'chore', 'epic'] as const;
export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
