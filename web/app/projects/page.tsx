'use client';
import { ModuleShell } from '../../components/shell/ModuleShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { ProjectsView } from '../../modules/projects/ProjectsView';

export default function ProjectsPage() {
  return (
    <ModuleShell moduleId="projects">
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Projects" />
        <ProjectsView />
      </div>
    </ModuleShell>
  );
}
