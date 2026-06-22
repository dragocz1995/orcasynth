import { spawn, execFile } from 'node:child_process';
import * as p from '@clack/prompts';
import { status } from './launcher.js';
import { defaultLifecycleDeps, formatStatus, runLifecycle } from './commands.js';
import { isFirstRun } from './setup.js';
import { runSetupWizard } from './setupWizard.js';
import { readInstallInfo, type InstallInfo } from './installInfo.js';

const BASE = process.env.ORCA_URL ?? 'http://localhost:4400';
const SERVICES = ['orca-daemon', 'orca-web'];

/** Open a URL in the user's default browser, cross-platform, fire-and-forget. */
function openUrl(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref(); } catch { /* headless box — ignore */ }
}

/** Run a command, resolving its stdout/exit code (never rejects). */
function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, (err, stdout) => {
      const code = err && typeof (err as { code?: unknown }).code === 'number' ? (err as { code: number }).code : err ? 1 : 0;
      resolve({ code, stdout: stdout?.toString() ?? '' });
    });
  });
}

/** systemctl, transparently via sudo when we aren't root (so a non-root operator still works). */
async function systemctl(...args: string[]): Promise<{ code: number; stdout: string }> {
  const asRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  return asRoot ? run('systemctl', args) : run('sudo', ['systemctl', ...args]);
}

/** Whether both ORCA units report active. */
async function servicesActive(): Promise<boolean> {
  const r = await systemctl('is-active', ...SERVICES);
  const states = r.stdout.trim().split('\n');
  return states.length > 0 && states.every((s) => s.trim() === 'active');
}

/** Launcher menu for a systemd-provisioned box (`orca install`): drives the units via systemctl and
 *  shows the real public URL the operator chose — never spawns a second, port-conflicting daemon. */
async function systemdMenu(info: InstallInfo, version: string): Promise<void> {
  p.intro(`🐋 orcasynth v${version}  ·  systemd`);
  for (;;) {
    const active = await servicesActive();
    const state = active ? `● orca is running  ·  ${info.publicUrl}` : '○ orca is stopped';
    const action = await p.select({
      message: state,
      options: [
        active ? { value: 'restart', label: 'Restart', hint: 'daemon + web' } : { value: 'start', label: 'Start', hint: 'daemon + web' },
        ...(active ? [{ value: 'stop', label: 'Stop' }] : []),
        { value: 'status', label: 'Status', hint: 'systemctl status' },
        { value: 'open', label: 'Open web UI', hint: info.publicUrl },
        { value: 'logs', label: 'Recent daemon logs' },
        { value: 'update', label: 'Update', hint: 'npm + restart services' },
        { value: 'exit', label: 'Exit' },
      ],
    });
    if (p.isCancel(action) || action === 'exit') break;

    if (action === 'open') { openUrl(info.publicUrl); p.log.success(`Opening ${info.publicUrl}`); continue; }
    if (action === 'status') { const r = await systemctl('status', '--no-pager', '-n', '0', ...SERVICES); p.note(r.stdout.trim() || '(no output)', 'Status'); continue; }
    if (action === 'logs') { const r = await run('journalctl', ['-u', 'orca-daemon', '-n', '20', '--no-pager']); p.note(r.stdout.trim() || '(no logs — try: journalctl -u orca-daemon)', 'orca-daemon'); continue; }
    if (action === 'update') {
      const s = p.spinner(); s.start('Updating orcasynth…');
      const upd = await run('npm', ['install', '-g', 'orcasynth@latest']);
      if (upd.code !== 0) { s.stop('Update failed — see npm output above.'); continue; }
      await systemctl('restart', ...SERVICES);
      s.stop('Updated and restarted.');
      continue;
    }
    // start | stop | restart
    const s = p.spinner(); s.start(`${action}…`);
    const r = await systemctl(action as string, ...SERVICES);
    s.stop(r.code === 0 ? `${action} ✓` : `${action} failed (code ${r.code})`);
  }
  p.outro('See you 🐋');
}

/** The interactive launcher menu shown when `orca` is run with no arguments in a terminal. */
export async function menu(env: NodeJS.ProcessEnv, version: string): Promise<void> {
  // A box provisioned by `orca install` is systemd-managed — drive those units, don't spawn our own.
  const info = readInstallInfo();
  if (info) { await systemdMenu(info, version); return; }

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
