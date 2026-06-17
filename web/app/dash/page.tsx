'use client';
export const dynamic = 'force-dynamic';
import { ModuleShell } from '../../components/shell/ModuleShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { DashboardView } from '../../modules/dashboard/DashboardView';

export default function DashPage() {
  return (
    <ModuleShell moduleId="dashboard">
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Dashboard" />
        <DashboardView />
      </div>
    </ModuleShell>
  );
}
