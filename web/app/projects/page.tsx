'use client';
import { ModuleShell } from '../../components/shell/ModuleShell';
import { Panel } from '../../components/ui/Panel';
import { PageHeader } from '../../components/ui/PageHeader';
import { ProjectsView } from '../../modules/projects/ProjectsView';

export default function ProjectsPage() {
  return (
    <ModuleShell moduleId="projects">
      <Panel>
        <PageHeader title="Projects" />
        <ProjectsView />
      </Panel>
    </ModuleShell>
  );
}
