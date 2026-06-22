import { describe, it, expect } from 'vitest';
import { AGENT_CLIS, detectAgentClis, installCommand } from '../../../src/cli/install/agentClis.js';
import { preflight, preflightBlockers } from '../../../src/cli/install/preflight.js';
import { userHome, ensureServiceUser } from '../../../src/cli/install/serviceUser.js';
import { isIpAddress } from '../../../src/cli/install/index.js';
import type { Runner, ExecResult } from '../../../src/cli/install/runner.js';

function runner(over: Partial<Runner> = {}): Runner {
  return {
    exec: async (): Promise<ExecResult> => ({ code: 0, stdout: '', stderr: '' }),
    which: async () => null,
    writeFile: async () => {},
    exists: async () => false,
    ...over,
  };
}

describe('install/agentClis', () => {
  it('covers claude, opencode and codex with their npm packages', () => {
    expect(AGENT_CLIS.map((c) => c.id).sort()).toEqual(['claude', 'codex', 'opencode']);
    expect(AGENT_CLIS.find((c) => c.id === 'claude')!.pkg).toBe('@anthropic-ai/claude-code');
  });
  it('detects which CLIs are installed for the service user', async () => {
    const r = runner({ which: async (cmd) => (cmd === 'claude' ? '/u/bin/claude' : null) });
    const found = await detectAgentClis(r, 'orca');
    expect(found.find((c) => c.id === 'claude')!.installed).toBe(true);
    expect(found.find((c) => c.id === 'opencode')!.installed).toBe(false);
  });
  it('installs a missing CLI via its official npm package', () => {
    const { cmd, args } = installCommand(AGENT_CLIS[1]!);
    expect(cmd).toBe('npm');
    expect(args).toEqual(['install', '-g', 'opencode-ai']);
  });
});

describe('install/preflight', () => {
  const ok = runner({
    exec: async (cmd, args) => {
      if (cmd === 'id') return { code: 0, stdout: '0\n', stderr: '' };
      if (cmd === 'node') return { code: 0, stdout: 'v22.22.2\n', stderr: '' };
      return { code: 0, stdout: '', stderr: '' };
    },
    which: async (cmd) => (cmd === 'apt-get' || cmd === 'tmux' ? `/usr/bin/${cmd}` : null),
  });

  it('passes on a root apt box with node ≥22 and tmux', async () => {
    const p = await preflight(ok);
    expect(p.isRoot).toBe(true);
    expect(p.pkgManager).toBe('apt');
    expect(p.node.ok).toBe(true);
    expect(p.tmux).toBe(true);
    expect(preflightBlockers(p)).toEqual([]);
  });
  it('blocks when not root and node is too old', async () => {
    const bad = runner({
      exec: async (cmd) => (cmd === 'id' ? { code: 0, stdout: '1000\n', stderr: '' } : cmd === 'node' ? { code: 0, stdout: 'v18.0.0\n', stderr: '' } : { code: 0, stdout: '', stderr: '' }),
      which: async () => null,
    });
    const p = await preflight(bad);
    const blockers = preflightBlockers(p);
    expect(p.isRoot).toBe(false);
    expect(blockers.join(' ')).toMatch(/root/i);
    expect(blockers.join(' ')).toMatch(/Node/i);
    expect(blockers.join(' ')).toMatch(/apt/i);
  });
});

describe('install/isIpAddress (no Let’s Encrypt for IPs)', () => {
  it('detects IPv4 and IPv6 addresses', () => {
    for (const ip of ['188.130.140.172', '127.0.0.1', '10.0.0.1', '::1', '2001:db8::1']) expect(isIpAddress(ip)).toBe(true);
  });
  it('treats domain names as non-IP', () => {
    for (const d of ['orca.example.com', 'example.com', 'my-host.dev']) expect(isIpAddress(d)).toBe(false);
  });
});

describe('install/serviceUser', () => {
  const passwd = (home: string): ExecResult => ({ code: 0, stdout: `orca:x:998:998::${home}:/bin/bash\n`, stderr: '' });

  it('reads HOME from getent passwd, null when the user is absent', async () => {
    const present = runner({ exec: async () => passwd('/var/lib/orca') });
    const absent = runner({ exec: async () => ({ code: 2, stdout: '', stderr: '' }) });
    expect(await userHome(present, 'orca')).toBe('/var/lib/orca');
    expect(await userHome(absent, 'orca')).toBeNull();
  });

  it('mode=existing returns the resolved HOME and never calls useradd', async () => {
    const calls: string[] = [];
    const r = runner({ exec: async (cmd) => { calls.push(cmd); return passwd('/home/deploy'); } });
    const res = await ensureServiceUser(r, { mode: 'existing', username: 'deploy' });
    expect(res).toEqual({ username: 'deploy', home: '/home/deploy' });
    expect(calls).not.toContain('useradd');
  });

  it('mode=existing throws when the user does not exist', async () => {
    const r = runner({ exec: async () => ({ code: 2, stdout: '', stderr: '' }) });
    await expect(ensureServiceUser(r, { mode: 'existing', username: 'ghost' })).rejects.toThrow(/does not exist/);
  });

  it('mode=create runs useradd --system with its own HOME when absent', async () => {
    let useraddArgs: string[] = [];
    const r = runner({
      exec: async (cmd, args) => {
        if (cmd === 'getent') return { code: 2, stdout: '', stderr: '' };
        if (cmd === 'useradd') { useraddArgs = args; return { code: 0, stdout: '', stderr: '' }; }
        return { code: 0, stdout: '', stderr: '' };
      },
    });
    const res = await ensureServiceUser(r, { mode: 'create', username: 'orca' });
    expect(res).toEqual({ username: 'orca', home: '/var/lib/orca' });
    expect(useraddArgs).toContain('--system');
    expect(useraddArgs).toContain('orca');
  });
});
