'use client';
import { useState } from 'react';
import { useProjects, useProjectGit } from '../../lib/queries';
import { useCreateProject } from '../../lib/mutations';
import { useToast } from '../../components/ui/Toast';
import { Section } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/states';

export function ProjectsView() {
  const projects = useProjects();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const git = useProjectGit(selectedId);

  const { toast } = useToast();
  const createProject = useCreateProject();

  const [slug, setSlug] = useState('');
  const [path, setPath] = useState('');
  const [notes, setNotes] = useState('');

  function handleCreate() {
    createProject.mutate(
      { slug, path, notes },
      {
        onSuccess: () => {
          setCreating(false);
          setSlug('');
          setPath('');
          setNotes('');
          toast('Project created');
        },
        onError: (e) => toast(String(e), 'error'),
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Projects"
        actions={<Button onClick={() => setCreating(true)}>New project</Button>}
      >
        {projects.isLoading && <LoadingState />}
        {projects.isError && <ErrorState message="Failed to load projects" onRetry={() => projects.refetch()} />}
        {projects.data && projects.data.length === 0 && <EmptyState title="No projects" />}
        {projects.data && projects.data.length > 0 && (
          <ul className="flex flex-col gap-1">
            {projects.data.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 text-left text-sm border rounded-none transition-colors ${selectedId === p.id ? 'border-accent text-accent' : 'border-transparent text-text hover:border-border'}`}
                >
                  <span className="font-medium">{p.slug}</span>
                  <span className="font-mono text-xs text-text-muted">{p.path}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {creating && (
        <Modal title="New project" onClose={() => setCreating(false)}>
          <div className="flex flex-col gap-3 p-4 max-w-md">
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Slug
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="bg-surface border border-border rounded-none px-2 py-1 text-sm text-text normal-case"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Path
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="bg-surface border border-border rounded-none px-2 py-1 text-sm text-text normal-case"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-text-muted">
              Pilot info
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="bg-surface border border-border rounded-none px-2 py-1 text-sm text-text normal-case resize-none"
              />
            </label>
            <div>
              <Button variant="accent" onClick={handleCreate} disabled={createProject.isPending}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedId && (
        <Section title="Git">
          {git.isLoading && <LoadingState />}
          {git.isError && <ErrorState message="Failed to load git info" onRetry={() => git.refetch()} />}
          {git.data && !git.data.isRepo && <EmptyState title="Not a git repository" />}
          {git.data && git.data.isRepo && git.data.status && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-text">{git.data.status.branch}</span>
                <Badge tone={git.data.status.dirty > 0 ? 'danger' : 'muted'}>{git.data.status.dirty} dirty</Badge>
                <Badge tone="accent">↑{git.data.status.ahead}</Badge>
                <Badge tone="accent">↓{git.data.status.behind}</Badge>
              </div>

              {git.data.branches.length > 0 && (
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-text-muted mb-2">Branches</p>
                  <ul className="flex flex-col gap-1">
                    {git.data.branches.map((b) => (
                      <li key={b.name} className="flex items-center gap-2 text-sm text-text">
                        <Badge tone={b.current ? 'accent' : 'muted'}>{b.name}{b.current ? ' *' : ''}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {git.data.commits.length > 0 && (
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-text-muted mb-2">Commits</p>
                  <ul className="flex flex-col gap-1">
                    {git.data.commits.map((c) => (
                      <li key={c.hash} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs text-text-muted">{c.hash}</span>
                        <span className="text-text">{c.subject}</span>
                        <span className="text-text-muted text-xs">{c.author} · {c.relative}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
