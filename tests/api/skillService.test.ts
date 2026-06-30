import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSkillService } from '../../src/api/services/skillService.js';

const MASTER_V2 = `---\nname: orca-workflow\ndescription: test\nmetadata:\n  version: 2\n---\n\nbody\n`;
const target = (home: string, root: string) => join(home, root, 'skills', 'orca-workflow', 'SKILL.md');

describe('skillService', () => {
  let home: string;
  const svc = () => createSkillService({ home, readMaster: () => MASTER_V2 });

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'orca-skill-'));
    // claude-code + codex are "present" (config root exists); opencode is absent.
    mkdirSync(join(home, '.claude'), { recursive: true });
    mkdirSync(join(home, '.codex'), { recursive: true });
  });
  afterEach(() => { rmSync(home, { recursive: true, force: true }); });

  it('reports present providers as not-installed before install', () => {
    const byId = Object.fromEntries(svc().status().map((s) => [s.provider, s]));
    expect(byId['claude-code']).toMatchObject({ present: true, installed: false, upToDate: false });
    expect(byId['codex']).toMatchObject({ present: true, installed: false });
    expect(byId['opencode']).toMatchObject({ present: false, installed: false });
  });

  it('installs into present providers and skips absent ones', () => {
    const results = Object.fromEntries(svc().installAll().map((r) => [r.provider, r]));
    expect(results['claude-code']).toMatchObject({ installed: true, skipped: false });
    expect(results['codex']).toMatchObject({ installed: true, skipped: false });
    expect(results['opencode']).toMatchObject({ installed: false, skipped: true });
    expect(existsSync(target(home, '.claude'))).toBe(true);
    expect(existsSync(target(home, '.codex'))).toBe(true);
    expect(existsSync(target(home, '.config/opencode'))).toBe(false);
    // status now reflects up-to-date for the present providers.
    const byId = Object.fromEntries(svc().status().map((s) => [s.provider, s]));
    expect(byId['claude-code']).toMatchObject({ installed: true, version: 2, upToDate: true });
    expect(byId['codex']).toMatchObject({ installed: true, version: 2, upToDate: true });
  });

  it('is idempotent — re-install leaves the same content', () => {
    svc().installAll();
    const first = readFileSync(target(home, '.claude'), 'utf-8');
    svc().installAll();
    expect(readFileSync(target(home, '.claude'), 'utf-8')).toBe(first);
    expect(first).toBe(MASTER_V2);
  });

  it('detects an outdated install and refreshes it on install', () => {
    // Pre-seed an old version (1) into claude-code's skills dir.
    const t = target(home, '.claude');
    mkdirSync(join(home, '.claude', 'skills', 'orca-workflow'), { recursive: true });
    writeFileSync(t, MASTER_V2.replace('version: 2', 'version: 1'), 'utf-8');
    const before = svc().status().find((s) => s.provider === 'claude-code')!;
    expect(before).toMatchObject({ installed: true, version: 1, upToDate: false });
    svc().installAll();
    const after = svc().status().find((s) => s.provider === 'claude-code')!;
    expect(after).toMatchObject({ version: 2, upToDate: true });
  });

  it('never touches a foreign skill in the same providers dir', () => {
    const foreign = join(home, '.claude', 'skills', 'other', 'SKILL.md');
    mkdirSync(join(home, '.claude', 'skills', 'other'), { recursive: true });
    writeFileSync(foreign, 'do not touch', 'utf-8');
    svc().installAll();
    expect(readFileSync(foreign, 'utf-8')).toBe('do not touch');
  });

  it('fails soft for every provider when the master is unreadable', () => {
    const broken = createSkillService({ home, readMaster: () => { throw new Error('boom'); } });
    const results = broken.installAll();
    expect(results.every((r) => !r.installed)).toBe(true);
    expect(existsSync(target(home, '.claude'))).toBe(false);
  });
});
