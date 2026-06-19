import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

export interface GitStatus { branch: string; ahead: number; behind: number; dirty: number; clean: boolean }
export interface GitBranch { name: string; current: boolean }
export interface GitCommit { hash: string; subject: string; author: string; relative: string }
export interface ProjectGit { isRepo: boolean; status: GitStatus | null; branches: GitBranch[]; commits: GitCommit[] }
export interface GitReader { read(path: string): Promise<ProjectGit> }

const EMPTY: ProjectGit = { isRepo: false, status: null, branches: [], commits: [] };

export class RealGitReader implements GitReader {
  async read(path: string): Promise<ProjectGit> {
    try { await run('git', ['-C', path, 'rev-parse', '--is-inside-work-tree']); }
    catch { return EMPTY; }
    const [status, branches, commits] = await Promise.all([this.status(path), this.branches(path), this.commits(path)]);
    return { isRepo: true, status, branches, commits };
  }
  private async status(path: string): Promise<GitStatus | null> {
    try {
      const { stdout } = await run('git', ['-C', path, 'status', '--porcelain=v2', '--branch'], { maxBuffer: 1024 * 1024 });
      const lines = stdout.split('\n');
      let branch = 'HEAD', ahead = 0, behind = 0, dirty = 0;
      for (const l of lines) {
        if (l.startsWith('# branch.head ')) branch = l.slice('# branch.head '.length).trim();
        else if (l.startsWith('# branch.ab ')) { const m = l.match(/\+(\d+)\s+-(\d+)/); if (m) { ahead = Number(m[1]); behind = Number(m[2]); } }
        else if (l && !l.startsWith('#')) dirty += 1;
      }
      return { branch, ahead, behind, dirty, clean: dirty === 0 };
    } catch { return null; }
  }
  private async branches(path: string): Promise<GitBranch[]> {
    try {
      const { stdout } = await run('git', ['-C', path, 'branch', '--format=%(HEAD)%09%(refname:short)'], { maxBuffer: 1024 * 1024 });
      return stdout.split('\n').filter(Boolean).map((l) => { const [head, name] = l.split('\t'); return { name: name ?? l.trim(), current: head === '*' }; });
    } catch { return []; }
  }
  private async commits(path: string): Promise<GitCommit[]> {
    try {
      const { stdout } = await run('git', ['-C', path, 'log', '-n', '15', '--pretty=format:%h%x09%s%x09%an%x09%cr'], { maxBuffer: 1024 * 1024 });
      return stdout.split('\n').filter(Boolean).map((l) => { const [hash = '', subject = '', author = '', relative = ''] = l.split('\t'); return { hash, subject, author, relative }; });
    } catch { return []; }
  }
}

export class FakeGitReader implements GitReader {
  constructor(private result: ProjectGit) {}
  async read(): Promise<ProjectGit> { return this.result; }
}
