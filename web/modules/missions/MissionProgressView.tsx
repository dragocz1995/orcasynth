'use client';
import { Rocket } from 'lucide-react';
import { useMissionDetail } from '../../lib/queries';
import { layoutPhases } from './layoutPhases';
import { statusTone } from '../dashboard/statusTone';
import { Section } from '../../components/ui/Section';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/states';

export function MissionProgressView({ missionId }: { missionId: string }) {
  const detail = useMissionDetail(missionId);

  if (detail.isLoading) return <LoadingState />;
  if (detail.isError) return <ErrorState message="orca daemon unreachable" onRetry={() => detail.refetch()} />;
  if (!detail.data) return null;

  const d = detail.data;
  const phases = layoutPhases(d.tasks, d.deps);

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-4">
      <Section
        title={d.epic?.title ?? d.mission.epic_id}
        icon={Rocket}
        actions={
          <Badge tone={d.mission.state === 'disengaged' ? 'muted' : 'accent'}>
            {d.mission.state}
          </Badge>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total" value={d.progress.total} />
          <StatCard label="Done" value={d.progress.closed} />
          <StatCard label="In progress" value={d.progress.inProgress} />
          <StatCard
            label="Blocked"
            value={d.progress.blocked}
            tone={d.progress.blocked > 0 ? 'danger' : 'default'}
          />
        </div>
      </Section>

      <Section title="Task flow">
        {phases.length === 0 ? (
          <EmptyState title="No tasks in this mission" />
        ) : (
          <div className="flex gap-4 overflow-x-auto">
            {phases.map((tasks, i) => (
              <div key={i} className="flex min-w-[13rem] flex-col gap-2">
                <span className="text-sm font-medium text-text">Phase {i + 1}</span>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-2 rounded-md border border-border bg-bg p-3"
                  >
                    <span className="text-sm text-text">{task.title}</span>
                    <Badge tone={statusTone(task.status)}>{task.status}</Badge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
