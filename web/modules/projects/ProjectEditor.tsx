'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronRight, File as FileIcon, Save, Code2, GitCompare, X } from 'lucide-react';
import type { FileNode } from '../../lib/types';
import { useProjectFiles, useProjectFile, useProjectFileDiff } from '../../lib/queries';
import { useWriteProjectFile } from '../../lib/mutations';
import { Button } from '../../components/ui/Button';
import { LoadingState, EmptyState } from '../../components/ui/states';
import { useToast } from '../../components/ui/Toast';
import { useTranslation } from '../../lib/i18n';

// Monaco is browser-only (web workers); never SSR it.
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), { ssr: false });

interface TreeNode { name: string; path: string; type: 'file' | 'dir'; children: TreeNode[] }

/** Build a nested tree from the flat (dir-before-children, sorted) file list. */
function buildTree(nodes: FileNode[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', type: 'dir', children: [] };
  const dirs = new Map<string, TreeNode>([['', root]]);
  for (const n of [...nodes].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = n.path.split('/');
    const parentPath = parts.slice(0, -1).join('/');
    const node: TreeNode = { name: parts[parts.length - 1] ?? n.path, path: n.path, type: n.type, children: [] };
    (dirs.get(parentPath) ?? root).children.push(node);
    if (n.type === 'dir') dirs.set(n.path, node);
  }
  return root.children;
}

/** Monaco language id from a file extension. */
function langOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    json: 'json', css: 'css', scss: 'scss', html: 'html', md: 'markdown', py: 'python', sh: 'shell', bash: 'shell',
    yml: 'yaml', yaml: 'yaml', sql: 'sql', toml: 'ini', env: 'ini', go: 'go', rs: 'rust', php: 'php',
  };
  return map[ext] ?? 'plaintext';
}

function TreeRow({ node, depth, expanded, onToggle, selected, onSelect }: {
  node: TreeNode; depth: number; expanded: Set<string>; onToggle: (p: string) => void; selected: string | null; onSelect: (p: string) => void;
}) {
  const isOpen = expanded.has(node.path);
  if (node.type === 'dir') {
    return (
      <>
        <button type="button" onClick={() => onToggle(node.path)} className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs text-text-muted transition-colors hover:bg-elevated" style={{ paddingLeft: depth * 12 + 6 }}>
          <ChevronRight size={12} className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen ? node.children.map((c) => <TreeRow key={c.path} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} selected={selected} onSelect={onSelect} />) : null}
      </>
    );
  }
  return (
    <button type="button" onClick={() => onSelect(node.path)} className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-elevated ${selected === node.path ? 'bg-accent/15 text-accent' : 'text-text'}`} style={{ paddingLeft: depth * 12 + 18 }} title={node.path}>
      <FileIcon size={12} className="shrink-0 text-text-muted" aria-hidden />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

/** Colored unified-diff view (git working-tree diff for one file). */
function DiffView({ diff, empty }: { diff: string; empty: string }) {
  if (!diff.trim()) return <p className="p-4 text-center text-sm text-text-muted">{empty}</p>;
  return (
    <pre className="h-full overflow-auto bg-bg p-3 font-mono text-xs leading-relaxed">
      {diff.split('\n').map((line, i) => {
        const c = line.startsWith('+') && !line.startsWith('+++') ? 'text-success'
          : line.startsWith('-') && !line.startsWith('---') ? 'text-danger'
          : line.startsWith('@@') ? 'text-accent'
          : 'text-text-muted';
        return <div key={i} className={c}>{line || ' '}</div>;
      })}
    </pre>
  );
}

/** Full project code editor: file tree + Monaco editor (edit & save) + per-file git diff. */
export function ProjectEditor({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const files = useProjectFiles(projectId);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'edit' | 'diff'>('edit');
  const [value, setValue] = useState('');
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const fileData = useProjectFile(projectId, selected);
  const diffData = useProjectFileDiff(projectId, tab === 'diff' ? selected : null);
  const write = useWriteProjectFile();

  const tree = useMemo(() => buildTree(files.data ?? []), [files.data]);
  const dirty = selected != null && loadedFor === selected && value !== (fileData.data?.content ?? '');

  // Seed the editor when a file's content arrives.
  useEffect(() => {
    if (selected && fileData.data && loadedFor !== selected) {
      setValue(fileData.data.content);
      setLoadedFor(selected);
    }
  }, [selected, fileData.data, loadedFor]);

  const openFile = (p: string) => { setSelected(p); setLoadedFor(null); setTab('edit'); };
  const toggle = (p: string) => setExpanded((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });
  const save = () => {
    if (!selected) return;
    write.mutate({ id: projectId, path: selected, content: value }, {
      onSuccess: () => { setLoadedFor(null); toast(t.projects.fileSaved.replace('{path}', selected)); },
      onError: (e) => toast(String(e), 'error'),
    });
  };

  return (
    <div className="mt-5 flex h-[70vh] flex-col overflow-hidden rounded-lg border border-border bg-surface" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Code2 size={15} className="text-accent" aria-hidden />
        <span className="text-sm font-semibold text-text">{t.projects.editorTitle}</span>
        {selected ? <span className="truncate font-mono text-xs text-text-muted">· {selected}{dirty ? ' •' : ''}</span> : null}
        <div className="ml-auto flex items-center gap-1.5">
          {selected ? (
            <>
              <Button variant={tab === 'edit' ? 'accent' : 'ghost'} onClick={() => setTab('edit')}>{t.projects.tabEdit}</Button>
              <Button variant={tab === 'diff' ? 'accent' : 'ghost'} icon={GitCompare} onClick={() => setTab('diff')}>{t.projects.tabDiff}</Button>
              <Button variant="accent" icon={Save} disabled={!dirty || write.isPending} onClick={save}>{t.common.save}</Button>
            </>
          ) : null}
          <button type="button" aria-label={t.common.close} onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-elevated hover:text-text"><X size={15} /></button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* file tree */}
        <div className="w-64 shrink-0 overflow-auto border-r border-border bg-bg/40 p-1.5">
          {files.isLoading ? <LoadingState />
            : tree.length === 0 ? <p className="p-3 text-center text-xs text-text-muted">{t.projects.noFiles}</p>
            : tree.map((n) => <TreeRow key={n.path} node={n} depth={0} expanded={expanded} onToggle={toggle} selected={selected} onSelect={openFile} />)}
        </div>

        {/* editor / diff */}
        <div className="min-w-0 flex-1">
          {!selected ? <EmptyState title={t.projects.selectFile} icon={FileIcon} />
            : fileData.data?.truncated ? <p className="p-4 text-center text-sm text-text-muted">{t.projects.fileTooBig}</p>
            : tab === 'diff' ? <DiffView diff={diffData.data?.diff ?? ''} empty={t.projects.noChanges} />
            : (
              <MonacoEditor
                key={selected}
                height="100%"
                theme="vs-dark"
                language={langOf(selected)}
                value={value}
                onChange={(v) => setValue(v ?? '')}
                options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
              />
            )}
        </div>
      </div>
    </div>
  );
}
