'use client';
import { useState } from 'react';
import { Rocket, Eye, Pause, Play, Power } from 'lucide-react';
import { useMissions, useConfig } from '../../lib/queries';
import { useEngage, usePauseMission, useResumeMission, useDisengage } from '../../lib/mutations';
import { EngageForm } from '../../components/control/EngageForm';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Section } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { IconButton } from '../../components/ui/IconButton';
import { Modal } from '../../components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/states';
import { ModuleShell } from '../../components/shell/ModuleShell';
import { MissionProgressView } from '../../modules/missions/MissionProgressView';

export default function MissionsPage() {
  const [detailId, setDetailId] = useState<string | null>(null);
  const missions = useMissions();
  const config = useConfig();
  const engage = useEngage();
  const pause = usePauseMission();
  const resume = useResumeMission();
  const disengage = useDisengage();
  const { toast } = useToast();

  return (
    <ModuleShell moduleId="missions">
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Missions" count={missions.data?.length} />
        <Section title="Missions" icon={Rocket}>
          <div className="flex flex-col gap-4">
            <EngageForm onEngage={(v) => engage.mutate(v, { onSuccess: () => toast(`Engaged ${v.epicId}`), onError: (e) => toast(String(e), 'error') })} defaultAutonomy={config.data?.defaults?.autonomy} defaultMaxSessions={config.data?.defaults?.maxSessions} />
            {missions.isLoading ? <LoadingState /> : missions.isError ? <ErrorState message="orca daemon unreachable" onRetry={() => missions.refetch()} />
              : missions.data && missions.data.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border">
                  {missions.data.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="font-mono text-xs text-text-muted">{m.id} · {m.epic_id}</span>
                      <div className="flex items-center gap-2">
                        <Badge tone="accent">{m.autonomy}</Badge>
                        <IconButton icon={Eye} label="Detail" onClick={() => setDetailId(m.id)} />
                        <IconButton icon={Pause} label="Pause" onClick={() => pause.mutate(m.id, { onSuccess: () => toast(`Paused ${m.id}`), onError: (e) => toast(String(e), 'error') })} />
                        <IconButton icon={Play} label="Resume" onClick={() => resume.mutate(m.id, { onSuccess: () => toast(`Resumed ${m.id}`), onError: (e) => toast(String(e), 'error') })} />
                        <IconButton icon={Power} label="Disengage" variant="danger" onClick={() => disengage.mutate(m.id, { onSuccess: () => toast(`Disengaged ${m.id}`), onError: (e) => toast(String(e), 'error') })} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No active missions" />}
          </div>
        </Section>
      </div>
      {detailId && (
        <Modal title={`Mission — ${detailId}`} onClose={() => setDetailId(null)}>
          <MissionProgressView missionId={detailId} />
        </Modal>
      )}
    </ModuleShell>
  );
}
