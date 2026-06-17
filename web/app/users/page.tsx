'use client';
import { ModuleShell } from '../../components/shell/ModuleShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { UsersPanel } from '../../modules/users/UsersPanel';

export default function UsersPage() {
  return (
    <ModuleShell moduleId="users">
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Users" />
        <UsersPanel />
      </div>
    </ModuleShell>
  );
}
