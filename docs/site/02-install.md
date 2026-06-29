---
title: Install
slug: install
order: 2
eyebrow: Getting started
---

# Install

Orcasynth runs as a single self-hosted daemon plus a Next.js web UI. You need
**Node ≥ 22** and **tmux** on the host.

## Install from npm

Install globally from npm — one command brings up the daemon **and** the web UI:

```bash
npm install -g orcasynth
orca            # interactive menu: start/stop · first-run setup · update · open web
```

Prefer it non-interactive? The same actions are plain subcommands:

```bash
orca up         # start the daemon (:4400) + web UI (:4500) in the background
orca status     # show what's running
orca down       # stop everything
orca update     # update to the latest release from npm
orca install    # guided provisioning wizard (domain/TLS, ports, first admin)
```

On first run, `orca` walks you through a quick setup — admin account, LLM provider + API key,
and a default model. Your data (config, the SQLite database, and logs) lives in
**`~/.config/orca/`** and survives every update.

> **Interactive terminals** use [`node-pty`](https://www.npmjs.com/package/node-pty), an
> optional native dependency. If its native addon can't build on your host, everything
> else runs unchanged — the live session previews just fall back to a read-only mirror
> instead of a type-into terminal.

Then open <http://localhost:4500> and sign in.

## Quickstart

1. Install and start: `npm install -g orcasynth && orca up`.
2. Open <http://localhost:4500> and complete the first-run onboarding (creates the admin
   user and the home project — no login needed until the first admin exists).
3. Configure your LLM provider and models in **Settings → Autopilot / Models**.
4. Create a task, or engage an autopilot mission and pick an autonomy level.
5. Watch agents run live in **Sessions**, and step in from the terminal when needed.

## Run from source

For development, or to run without a global install. Requires **Node ≥ 22** and **tmux**.

```bash
# 1. Daemon (REST API on :4400)
npm install
npm run build
ORCA_BOOTSTRAP_USER=admin ORCA_BOOTSTRAP_PASS=changeme node dist/daemon/index.js

# 2. Web UI (on :4500)
cd web
npm install
npm run build
npm start -- -p 4500
```

Open <http://localhost:4500> and sign in. Configure your LLM provider and models in
**Settings → Autopilot / Models**, then create a task or engage an autopilot mission.

The CLI talks to the daemon over the REST API and auto-starts it if it isn't running:

```bash
node dist/cli/index.js ls          # list tasks
node dist/cli/index.js close <id>  # close a task
```

## Ports & data

| What | Where |
|---|---|
| Daemon REST API + SSE | `:4400` |
| Web UI (Next.js) | `:4500` |
| Config, SQLite DB, logs | `~/.config/orca/` |

See the [CLI reference](/docs/cli) for every command, and
[Architecture](/docs/architecture) for how the daemon is wired.
