'use client';
import { Rocket } from 'lucide-react';
import { useMissionDetail } from '../../lib/queries';
import { Section } from '../../components/ui/Section';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/states';
import { useTranslation } from '../../lib/i18n';
import { DependencyGraph } from './DependencyGraph';

export function MissionProgressView({ missionId }: { missionId: string }) {
  const detail = useMissionDetail(missionId);
  const { t } = useTranslation();

  if (detail.isLoading) return <LoadingState />;
  if (detail.isError) return <ErrorState message={t.common.daemonUnreachable} onRetry={() => detail.refetch()} />;
  if (!detail.data) return null;

  const d = detail.data;
  const STATE_LABEL: Record<string, string> = { active: t.missions.stateActive, paused: t.missions.paused, disengaged: t.missions.stateDisengaged };

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-4">
      <Section
        title={d.epic?.title ?? d.mission.epic_id}
        icon={Rocket}
        actions={
          <Badge tone={d.mission.state === 'disengaged' ? 'muted' : 'accent'}>
            {STATE_LABEL[d.mission.state] ?? d.mission.state}
          </Badge>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label={t.missions.total} value={d.progress.total} />
          <StatCard label={t.missions.done} value={d.progress.closed} />
          <StatCard label={t.missions.inProgress} value={d.progress.inProgress} />
          <StatCard
            label={t.missions.blocked}
            value={d.progress.blocked}
            tone={d.progress.blocked > 0 ? 'danger' : 'default'}
          />
        </div>
      </Section>

      <Section title={t.missions.taskFlow}>
        {d.tasks.length === 0 ? (
          <EmptyState title={t.missions.noTasks} />
        ) : (
          <DependencyGraph tasks={d.tasks} deps={d.deps} />
        )}
      </Section>
    </div>
  );
}
