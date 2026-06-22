import type { Runner } from './runner.js';

/** The agent CLIs ORCA can drive, with the npm package that installs each. `orca install` detects
 *  which are present for the service user and offers to install the rest. */
export interface AgentCli { id: string; bin: string; pkg: string }

export const AGENT_CLIS: AgentCli[] = [
  { id: 'claude', bin: 'claude', pkg: '@anthropic-ai/claude-code' },
  { id: 'opencode', bin: 'opencode', pkg: 'opencode-ai' },
  { id: 'codex', bin: 'codex', pkg: '@openai/codex' },
];

export interface DetectedCli extends AgentCli { installed: boolean; path: string | null }

/** Resolve each CLI on the SERVICE USER's PATH (not root's) — that's who runs the agents, and where
 *  their `… login` auth must live. */
export async function detectAgentClis(r: Runner, asUser: string): Promise<DetectedCli[]> {
  return Promise.all(
    AGENT_CLIS.map(async (c) => {
      const path = await r.which(c.bin, asUser);
      return { ...c, installed: path !== null, path };
    }),
  );
}

export function installCommand(cli: AgentCli): { cmd: string; args: string[] } {
  return { cmd: 'npm', args: ['install', '-g', cli.pkg] };
}
