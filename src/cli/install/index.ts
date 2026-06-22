import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import * as p from '@clack/prompts';
import { realRunner, type Runner } from './runner.js';
import { preflight, preflightBlockers } from './preflight.js';
import { ensureServiceUser, type ServiceUserChoice } from './serviceUser.js';
import { detectAgentClis, installCommand } from './agentClis.js';
import { daemonUnit, webUnit, type UnitParams } from './systemdUnits.js';
import { detectProxy, nginxVhost, apacheVhost, certbotCommand, type ProxyKind } from './proxy.js';
import { runSetupWizard } from '../setupWizard.js';

const DAEMON_PORT = Number(process.env.ORCA_PORT ?? 4400);
const WEB_PORT = Number(process.env.ORCA_WEB_PORT ?? 4500);

/** Absolute paths into the globally-installed package — this file lives at
 *  <pkgRoot>/dist/cli/install/index.js, so the daemon entry and web bundle resolve relative to it. */
function packagePaths(): { pkgRoot: string; daemonEntry: string; webServer: string } {
  const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  return {
    pkgRoot,
    daemonEntry: join(pkgRoot, 'dist', 'daemon', 'index.js'),
    webServer: join(pkgRoot, 'web-dist', 'server.js'),
  };
}

/** npm's global bin dir (where the `orca` symlink + globally-installed agent CLIs land). */
async function npmGlobalBin(r: Runner): Promise<string> {
  const res = await r.exec('npm', ['prefix', '-g']);
  const prefix = res.stdout.trim() || '/usr/local';
  return join(prefix, 'bin');
}

/** Cancel the whole wizard cleanly when a clack prompt is aborted (Ctrl-C). */
function bail(v: unknown): asserts v is string {
  if (p.isCancel(v)) { p.cancel('Installation cancelled.'); process.exit(1); }
}

async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const s = p.spinner();
  s.start(label);
  try {
    const out = await fn();
    s.stop(`${label} ✓`);
    return out;
  } catch (e) {
    s.stop(`${label} ✗`);
    throw e;
  }
}

/** Run a command and throw with its stderr when it fails — used for the system mutations where a
 *  non-zero exit must abort the wizard rather than silently continue. */
async function must(r: Runner, cmd: string, args: string[], opts?: { user?: string }): Promise<void> {
  const res = await r.exec(cmd, args, opts);
  if (res.code !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${(res.stderr || res.stdout).trim() || res.code}`);
}

/** Poll the daemon's /setup endpoint until it answers (services just came up) or we give up. */
async function waitForDaemon(base: string, tries = 40): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${base}/setup`);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 500));
  }
  return false;
}

/** Prompt for the service user and ensure it exists. */
async function chooseServiceUser(r: Runner): Promise<{ username: string; home: string }> {
  const mode = await p.select({
    message: 'Which user should the ORCA services and agents run as?',
    options: [
      { value: 'create', label: 'Create a dedicated "orca" system user', hint: 'recommended' },
      { value: 'existing', label: 'Use an existing user' },
    ],
  });
  bail(mode);

  let username = 'orca';
  if (mode === 'existing') {
    const name = await p.text({ message: 'Existing username', validate: (v) => ((v ?? '').trim() ? undefined : 'Required') });
    bail(name);
    username = name.trim();
  } else {
    const name = await p.text({ message: 'New username', initialValue: 'orca' });
    bail(name);
    username = name.trim() || 'orca';
  }

  const choice: ServiceUserChoice = { mode: mode as ServiceUserChoice['mode'], username };
  return step(`Service user "${username}"`, () => ensureServiceUser(r, choice));
}

/** Detect the agent CLIs for the service user and offer to install the missing ones. */
async function provisionAgentClis(r: Runner, user: string): Promise<void> {
  const detected = await detectAgentClis(r, user);
  const installed = detected.filter((c) => c.installed).map((c) => c.id);
  const missing = detected.filter((c) => !c.installed);
  if (installed.length) p.log.success(`Found: ${installed.join(', ')}`);
  if (!missing.length) return;

  const pick = await p.multiselect({
    message: 'Install missing agent CLIs? (space to toggle, enter to confirm)',
    required: false,
    options: missing.map((c) => ({ value: c.id, label: c.id, hint: c.pkg })),
  });
  if (p.isCancel(pick) || !pick.length) { p.log.info('Skipping agent CLI install — you can install them later.'); return; }

  for (const id of pick) {
    const cli = missing.find((c) => c.id === id)!;
    const { cmd, args } = installCommand(cli);
    await step(`Installing ${cli.id}`, () => must(r, cmd, args));
  }
}

/** Write + enable the two systemd units and verify they came active. */
async function provisionSystemd(r: Runner, user: string, home: string): Promise<void> {
  const { daemonEntry, webServer } = packagePaths();
  const params: UnitParams = {
    user,
    home,
    nodePath: process.execPath,
    daemonEntry,
    webServer,
    npmGlobalBin: await npmGlobalBin(r),
    daemonPort: DAEMON_PORT,
    webPort: WEB_PORT,
  };

  await step('Configuring systemd services', async () => {
    // Ensure the data tree exists and is owned by the service user before first boot.
    await must(r, 'mkdir', ['-p', join(home, '.config', 'orca', 'logs')]);
    await must(r, 'chown', ['-R', `${user}:`, join(home, '.config', 'orca')]);

    await r.writeFile('/etc/systemd/system/orca-daemon.service', daemonUnit(params));
    await r.writeFile('/etc/systemd/system/orca-web.service', webUnit(params));
    await must(r, 'systemctl', ['daemon-reload']);
    await must(r, 'systemctl', ['enable', '--now', 'orca-daemon.service']);
    await must(r, 'systemctl', ['enable', '--now', 'orca-web.service']);
  });

  for (const svc of ['orca-daemon', 'orca-web']) {
    const res = await r.exec('systemctl', ['is-active', svc]);
    if (res.stdout.trim() !== 'active') throw new Error(`${svc} did not start (systemctl status ${svc})`);
  }
}

async function ensureProxyInstalled(r: Runner): Promise<ProxyKind> {
  const existing = await detectProxy(r);
  if (existing) { p.log.success(`Reverse proxy: ${existing}`); return existing; }

  const which = await p.select({
    message: 'No reverse proxy found. Install one?',
    options: [
      { value: 'nginx', label: 'nginx', hint: 'recommended' },
      { value: 'apache', label: 'apache2' },
    ],
  });
  bail(which);
  const pkg = which === 'nginx' ? 'nginx' : 'apache2';
  await step(`Installing ${pkg}`, async () => {
    await must(r, 'apt-get', ['update']);
    await must(r, 'apt-get', ['install', '-y', pkg]);
  });
  return which as ProxyKind;
}

/** Configure the reverse proxy vhost for the domain and obtain a Let's Encrypt cert. */
async function provisionProxy(r: Runner, domain: string): Promise<void> {
  const kind = await ensureProxyInstalled(r);

  await step(`Configuring ${kind} for ${domain}`, async () => {
    if (kind === 'nginx') {
      await r.writeFile('/etc/nginx/sites-available/orca.conf', nginxVhost(domain, WEB_PORT));
      await must(r, 'ln', ['-sf', '/etc/nginx/sites-available/orca.conf', '/etc/nginx/sites-enabled/orca.conf']);
      await must(r, 'nginx', ['-t']);
      await must(r, 'systemctl', ['reload', 'nginx']);
    } else {
      await r.writeFile('/etc/apache2/sites-available/orca.conf', apacheVhost(domain, WEB_PORT));
      await must(r, 'a2enmod', ['proxy', 'proxy_http']);
      await must(r, 'a2ensite', ['orca']);
      await must(r, 'systemctl', ['reload', 'apache2']);
    }
  });

  const wantTls = await p.confirm({ message: `Obtain a free HTTPS certificate for ${domain} via Let's Encrypt?` });
  if (p.isCancel(wantTls) || !wantTls) { p.log.info('Skipping HTTPS — you can run certbot later.'); return; }

  const email = await p.text({ message: 'Email for certificate renewal notices (blank to skip registration)', placeholder: 'you@example.com' });
  bail(email);

  if (!(await r.which('certbot'))) {
    const certPkg = kind === 'nginx' ? 'python3-certbot-nginx' : 'python3-certbot-apache';
    await step('Installing certbot', async () => {
      await must(r, 'apt-get', ['update']);
      await must(r, 'apt-get', ['install', '-y', 'certbot', certPkg]);
    });
  }

  const { cmd, args } = certbotCommand(kind, domain, email.trim() || undefined);
  await step('Requesting HTTPS certificate', () => must(r, cmd, args));
}

/** End-to-end check: the admin we just created can authenticate against the running daemon. */
async function loginSmokeTest(base: string, username: string, password: string): Promise<void> {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`login returned ${res.status}`);
  const body = await res.json() as { token?: string };
  if (!body.token) throw new Error('login returned no token');
}

/** `orca install` — the provisioning wizard. Run as root on a fresh Debian/Ubuntu box; sets up the
 *  service user, agent CLIs, systemd units, reverse proxy + TLS, and the first admin account. */
export async function install(): Promise<void> {
  const r = realRunner();
  p.intro('🐋 orca install');

  const pf = await preflight(r);
  const blockers = preflightBlockers(pf);
  if (blockers.length) {
    blockers.forEach((b) => p.log.error(b));
    p.outro('Cannot continue.');
    process.exit(1);
  }

  if (!pf.tmux) {
    const wantTmux = await p.confirm({ message: 'tmux is required to run agents and is not installed. Install it now?' });
    if (!p.isCancel(wantTmux) && wantTmux) {
      await step('Installing tmux', async () => {
        await must(r, 'apt-get', ['update']);
        await must(r, 'apt-get', ['install', '-y', 'tmux']);
      });
    } else {
      p.log.warn('Continuing without tmux — agents will not run until it is installed.');
    }
  }

  const { username, home } = await chooseServiceUser(r);
  await provisionAgentClis(r, username);
  await provisionSystemd(r, username, home);

  const base = `http://127.0.0.1:${DAEMON_PORT}`;
  const ready = await step('Waiting for the daemon', () => waitForDaemon(base));
  if (!ready) throw new Error('daemon did not become reachable — check: journalctl -u orca-daemon');

  const domain = await p.text({
    message: 'Domain for the web UI (blank to skip the reverse proxy and serve on localhost only)',
    placeholder: 'orca.example.com',
  });
  bail(domain);
  if (domain.trim()) await provisionProxy(r, domain.trim());

  // First admin + LLM provider via the shared wizard, then prove the login works end-to-end.
  p.log.step('Create the first admin account');
  const creds = await runSetupWizard(base);
  if (creds) {
    await step('Verifying login', () => loginSmokeTest(base, creds.username, creds.password));
    p.log.info('You can verify the services any time with: systemctl status orca-daemon orca-web');
  }

  const url = domain.trim() ? `https://${domain.trim()}` : `http://127.0.0.1:${WEB_PORT}`;
  p.outro(`Done — ORCA is live at ${url} 🐋`);
}
