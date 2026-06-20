import { describe, it, expect, vi } from 'vitest';
import { pilotPrompt, makePilot } from '../../src/overseer/pilotAgent.js';

describe('pilotPrompt', () => {
  it('instructs submit via orca plan submit and forbids implementing', () => {
    const p = pilotPrompt('add CSV export', 'pj-9', 'use the Tasks table');
    expect(p).toContain('orca plan submit');
    expect(p).toContain('add CSV export');
    expect(p).toContain('use the Tasks table');
    expect(p.toLowerCase()).toContain('do not write any code');
  });
});

describe('makePilot', () => {
  it('spawns an agent in plan mode with ORCA_PLAN_JOB in env and the plan prompt as rawPrompt', async () => {
    const launch = vi.fn().mockResolvedValue({ session: 'orca-pilotX' });
    const pilot = makePilot({
      spawn: { launch } as never,
      config: { get: () => ({ autopilot: { pilotExec: 'claude:opus', prompt: 'TPL {{goal}}', notes: '' } }), apiKey: () => null } as never,
      projects: { get: () => ({ id: 1, path: '/repo', notes: 'N' }) } as never,
      nameAgent: () => 'pilotX',
    });
    await pilot({ id: 'pj-9', goal: 'g', projectId: 1, epicId: null, dryRun: false, status: 'planning', phases: [] }, '/repo');
    expect(launch).toHaveBeenCalledTimes(1);
    const arg = launch.mock.calls[0]![0];
    expect(arg.spec).toEqual({ program: 'claude-code', model: 'opus' });
    expect(arg.extraEnv).toEqual({ ORCA_PLAN_JOB: 'pj-9' });
    expect(arg.projectPath).toBe('/repo');
    expect(arg.rawPrompt).toContain('orca plan submit');
  });
});
