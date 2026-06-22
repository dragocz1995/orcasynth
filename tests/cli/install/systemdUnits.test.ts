import { describe, it, expect } from 'vitest';
import { daemonUnit, webUnit, type UnitParams } from '../../../src/cli/install/systemdUnits.js';

const p: UnitParams = {
  user: 'orca', home: '/var/lib/orca', nodePath: '/usr/bin/node',
  daemonEntry: '/g/lib/node_modules/orcasynth/dist/daemon/index.js',
  webServer: '/g/lib/node_modules/orcasynth/web-dist/server.js',
  npmGlobalBin: '/g/bin', daemonPort: 4400, webPort: 4500,
};

describe('install/systemdUnits.daemonUnit', () => {
  const u = daemonUnit(p);
  it('runs as the service user, not root', () => expect(u).toMatch(/^User=orca$/m));
  it('uses the global orca command for agents (ORCA_CLI=orca)', () => expect(u).toMatch(/^Environment=ORCA_CLI=orca$/m));
  it('points data + logs at the user HOME', () => {
    expect(u).toMatch(/ORCA_DB=\/var\/lib\/orca\/\.config\/orca\/orca\.db/);
    expect(u).toMatch(/ORCA_LOG_DIR=\/var\/lib\/orca\/\.config\/orca\/logs/);
  });
  it('prepends the npm-global bin to PATH so orca + agent CLIs resolve', () => {
    expect(u).toMatch(/^Environment=PATH=\/g\/bin:/m);
  });
  it('execs the daemon entry via node and auto-restarts', () => {
    expect(u).toContain('ExecStart=/usr/bin/node /g/lib/node_modules/orcasynth/dist/daemon/index.js');
    expect(u).toMatch(/^Restart=on-failure$/m);
    expect(u).toMatch(/^WantedBy=multi-user\.target$/m);
  });
});

describe('install/systemdUnits.webUnit', () => {
  const u = webUnit(p);
  it('binds the web port and points at the local daemon, after it', () => {
    expect(u).toMatch(/^Environment=PORT=4500$/m);
    expect(u).toMatch(/ORCA_DAEMON_URL=http:\/\/127\.0\.0\.1:4400/);
    expect(u).toMatch(/After=network\.target orca-daemon\.service/);
  });
  it('runs the standalone server as the service user', () => {
    expect(u).toContain('ExecStart=/usr/bin/node /g/lib/node_modules/orcasynth/web-dist/server.js');
    expect(u).toMatch(/^User=orca$/m);
  });
});
