import { spawn } from 'node:child_process';
import * as p from '@clack/prompts';
import { status } from './launcher.js';
import { defaultLifecycleDeps, formatStatus, runLifecycle } from './commands.js';
import { isFirstRun } from './setup.js';
import { runSetupWizard } from './setupWizard.js';

const BASE = process.env.ORCA_URL ?? 'http://localhost:4400';

/** Open a URL in the user's default browser, cross-platform, fire-and-forget. */
function openUrl(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref(); } catch { /* headless box — ignore */ }
}

/** The interactive launcher menu shown when `orca` is run with no arguments in a terminal. */
export async function menu(env: NodeJS.ProcessEnv, version: string): Promise<void> {
  const deps = defaultLifecycleDeps(version);
  p.intro(`🐋 orcasynth v${version}`);

  for (;;) {
    const st = await status(env);
    const running = st.daemon.running;
    const webUrl = `http://localhost:${st.web.port || 4500}`;
    // At-a-glance state as the prompt title, so it refreshes every loop without piling up notes.
    const state = running
      ? `${st.daemon.healthy && st.web.healthy ? '● ' : '◐ '}orca is running  ·  ${webUrl}`
      : '○ orca is stopped';
    const action = await p.select({
      message: state,
      options: [
        running
          ? { value: 'down', label: 'Stop orca', hint: 'daemon + web' }
          : { value: 'up', label: 'Start orca', hint: 'daemon + web' },
        { value: 'status', label: 'Status', hint: 'service health + ports' },
        { value: 'open', label: 'Open web UI', hint: webUrl },
        { value: 'update', label: 'Update', hint: 'check npm for a newer version' },
        { value: 'exit', label: 'Exit' },
      ],
    });
    if (p.isCancel(action) || action === 'exit') break;

    if (action === 'status') { p.note(formatStatus(st, version), 'Status'); continue; }
    if (action === 'open') {
      if (!running) { await runLifecycle('up', env, deps); }
      openUrl(webUrl);
      p.log.success(`Opening ${webUrl}`);
      continue;
    }
    if (action === 'up') {
      await runLifecycle('up', env, deps);
      // A brand-new install has no admin yet — offer the wizard right after the daemon is up.
      try {
        if (await isFirstRun(fetch, BASE) && await runSetupWizard(BASE)) {
          p.log.success(`Sign in at ${webUrl}`);
        }
      } catch (e) { p.log.warn(`Skipped setup: ${(e as Error).message}`); }
      continue;
    }
    await runLifecycle(action, env, deps); // 'down' | 'update'
  }

  p.outro('See you 🐋');
}
