/** Pure renderers for the two systemd unit files `orca install` writes. Kept string-only and
 *  side-effect-free so they're unit-tested without touching /etc; the wizard writes + enables them. */

export interface UnitParams {
  /** Unprivileged system user the services run as (never root). */
  user: string;
  /** That user's HOME — holds ~/.config/orca (DB, logs, config) and the agent CLIs' auth. */
  home: string;
  /** Absolute node binary (ExecStart can't rely on PATH resolution at unit level). */
  nodePath: string;
  /** Absolute path to the installed daemon entry (dist/daemon/index.js inside the global package). */
  daemonEntry: string;
  /** Absolute path to the bundled web standalone server (web-dist/server.js). */
  webServer: string;
  /** npm global bin dir — prepended to PATH so the service finds `orca` and the agent CLIs. */
  npmGlobalBin: string;
  daemonPort: number;
  webPort: number;
  /** Interface the web server binds. `127.0.0.1` when a reverse proxy fronts it; `0.0.0.0` for the
   *  proxy-less "direct port" mode where the browser hits http://<host>:<webPort> straight. */
  webHost: string;
}

const BASE_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

export function daemonUnit(p: UnitParams): string {
  return `[Unit]
Description=ORCA daemon (REST API)
After=network.target

[Service]
Type=simple
User=${p.user}
Environment=ORCA_CLI=orca
Environment=ORCA_DB=${p.home}/.config/orca/orca.db
Environment=ORCA_LOG_DIR=${p.home}/.config/orca/logs
Environment=ORCA_PORT=${p.daemonPort}
Environment=ORCA_HOST=127.0.0.1
Environment=PATH=${p.npmGlobalBin}:${BASE_PATH}
ExecStart=${p.nodePath} ${p.daemonEntry}
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
`;
}

export function webUnit(p: UnitParams): string {
  return `[Unit]
Description=ORCA web UI
After=network.target orca-daemon.service
Wants=orca-daemon.service

[Service]
Type=simple
User=${p.user}
Environment=PORT=${p.webPort}
Environment=HOSTNAME=${p.webHost}
Environment=ORCA_DAEMON_URL=http://127.0.0.1:${p.daemonPort}
Environment=ORCA_LOG_DIR=${p.home}/.config/orca/logs
Environment=PATH=${p.npmGlobalBin}:${BASE_PATH}
ExecStart=${p.nodePath} ${p.webServer}
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
`;
}
