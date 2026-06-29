---
title: CLI
slug: cli
order: 5
eyebrow: Reference
---

# CLI

The `orca` CLI connects to the daemon and provides quick access to common operations. It is
also used by spawned reasoning agents (Pilot, Overseer) to submit plans and answer decisions.

```bash
npm install -g orcasynth   # makes `orca` available globally
# or, from a source checkout:
node dist/cli/index.js <command>
```

## Two command families

- **API commands** (`ls`, `ready`, `sessions`, `close`, `note`, `plan`, `overseer`, `api`) talk
  to the daemon REST API. They auto-start the daemon if it isn't running (disable with
  `ORCA_AUTOSTART=0`).
- **Lifecycle commands** (`up`, `down`, `status`, `update`, `install`) manage the daemon
  itself — they never auto-start it. Run `orca` with no argument for the interactive launcher menu.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ORCA_URL` | `http://localhost:4400` | Daemon address |
| `ORCA_TOKEN` | — | API token for authenticated requests (set by the daemon for spawned agents) |
| `ORCA_AUTOSTART` | enabled | Auto-start the daemon if not running (set `0` to disable) |
| `ORCA_PLAN_JOB` | — | Plan job ID injected by the daemon for the Pilot agent |
| `ORCA_MISSION` | — | Mission ID injected by the daemon for the Overseer agent |

> `ORCA_DB`, `ORCA_PORT`, `ORCA_HOST`, `ORCA_PROJECT_PATH`, `ORCA_BOOTSTRAP_USER`,
> `ORCA_BOOTSTRAP_PASS`, and `ORCA_CLI` are daemon-side variables — the CLI does not read them.

## API commands

### `orca ls`

List all tasks from the daemon (`GET /tasks`). Outputs a JSON array.

```bash
orca ls
```

### `orca ready`

List tasks that are ready to be worked on — open, non-epic, all dependencies fulfilled
(`GET /tasks/ready`).

```bash
orca ready
```

### `orca sessions`

List active orca-managed tmux sessions (`orca-*` prefix), classified by role
(`GET /sessions`).

```bash
orca sessions
```

```json
[
  { "name": "orca-Iris0", "role": "agent", "agent": "Iris0" },
  { "name": "orca-pilot-Aria", "role": "pilot", "agent": "Aria" },
  { "name": "orca-overseer-m-my-project-a1b2c3d4", "role": "overseer", "agent": "", "missionId": "m-my-project-a1b2c3d4" }
]
```

### `orca close`

Close a task with a result summary and outcome. Used by agents to signal completion. Calls
`PATCH /tasks/:id` with `status: "closed"`, `result_summary`, and `outcome`.

```bash
orca close orca-ab12cd34 --summary "Fixed the login redirect bug" --outcome ok
orca close orca-ef56gh78 --summary "Could not reproduce the issue" --outcome fail
```

| Flag | Description |
|---|---|
| `--summary <text>` | Human-readable result description |
| `--outcome ok\|fail` | Outcome of the task (invalid value exits with code 2) |

### `orca note`

Inter-agent handoff notes for a mission. Agents leave context for later phases; the next
agent reads them before starting. `<missionId>` is the epic id or `m-<epicId>` — the daemon
normalizes the prefix.

```bash
orca note add <missionId> "<text>"   # leave a handoff note
orca note ls  <missionId>            # read this mission's notes (oldest-first)
```

### `orca plan submit`

Used by the **Pilot agent** to submit a structured plan for an async planning job. The job ID
is injected via `ORCA_PLAN_JOB` — the Pilot never passes it manually. Calls
`POST /plan/:jobId/submit`.

```bash
orca plan submit --phases '[{"title":"Set up database","type":"chore"},{"title":"Create API endpoints","type":"feature"}]'
```

| Flag | Description |
|---|---|
| `--phases <json>` | JSON array of phase objects (title + type + optional agent/details) |

### `orca overseer poll`

Used by the parked **Overseer agent** to long-poll for pending decisions. The CLI loop absorbs
heartbeat keep-alives so the LLM is woken only for real decisions. Blocks indefinitely,
surfacing only decisions with an `id` or `error` field. Requires `ORCA_MISSION`.

```bash
orca overseer poll
```

### `orca overseer decide`

Used by the parked **Overseer agent** to submit a verdict. A `question`-kind decision uses
`--choice`; a permission/review decision uses `--approve` or `--escalate`. Calls
`POST /missions/:missionId/overseer/decide`. Requires `ORCA_MISSION`.

```bash
orca overseer decide --id a1b2c3d4e5f6 --approve --confidence 0.85 --rationale "Schema change is scoped and safe"
orca overseer decide --id b2c3d4e5f6 --escalate --rationale "This migrates production data — needs human review"
orca overseer decide --id c3d4e5f6a1b2 --choice opt_rollback --rationale "Rollback is the safest option"
```

| Flag | Description |
|---|---|
| `--id <id>` | Decision ID from `orca overseer poll` |
| `--approve` | Approve the action (confidence defaults to `0.7` when omitted) |
| `--escalate` | Escalate to a human (sets confidence to `0`) |
| `--choice <optionId>` | Pick an option for a `question`-kind decision |
| `--confidence <0..1>` | Confidence level |
| `--rationale "<text>"` | Reason for the decision |

> The destructive heuristic is applied server-side at enqueue time and is authoritative — the
> agent's `--approve` cannot override a destructive classification.

### `orca api` (generic REST passthrough)

Generic authenticated REST passthrough — call any Orca endpoint with no per-endpoint CLI
command. Reads `ORCA_URL`/`ORCA_TOKEN` from the environment the daemon injects into every
spawned agent, so an agent (including the assistant) can drive any endpoint. A new REST
endpoint needs zero CLI edits.

```bash
orca api GET /tasks
orca api POST /tasks '{"title":"Fix the build","project_id":1}'
orca api POST /tasks/plan '{"goal":"Add dark mode","project_id":1}'
orca api GET /sessions
```

**Exit codes:** `0` = HTTP 2xx · `1` = non-2xx response (body still printed) · `2` = usage error
or invalid JSON body.

## Lifecycle commands

These manage the daemon itself and never auto-start it.

| Command | What it does |
|---|---|
| `orca up` | Start the daemon (:4400) and the web UI (:4500) in the background. Fails loudly if the daemon never becomes healthy. |
| `orca down` | Stop the daemon and the web UI. |
| `orca status` | Print a one-glance block of which services are running and healthy. |
| `orca update` | Update to the latest npm release and restart the services in place. Self-locating and systemd-aware. |
| `orca install` | Guided provisioning wizard (run as root): systemd units, a reverse proxy, and the first admin. |

`orca update` is **self-locating**: the binary derives its own install prefix from its
filesystem path, so it reinstalls itself in place no matter where it was globally installed.
When the global packages directory isn't writable by the current user, the update routes the
`npm install` through `sudo` (granted via a pinned sudoers drop-in by `orca install`). A
systemd-managed box restarts the units via `systemctl`.

## Daemon autostart

The CLI automatically starts the daemon for API commands if it isn't running: it hits
`GET /health`, spawns the daemon as a detached child if unreachable, then polls health until
ready (timing out with `orca daemon did not become healthy`). Disable with `ORCA_AUTOSTART=0`:

```bash
ORCA_AUTOSTART=0 orca ls
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error (daemon unreachable, invalid command, missing env var, invalid JSON) |
| `2` | Invalid `--outcome` value (must be `ok` or `fail`) |

See [Concepts](/docs/concepts) for what these commands drive, and
[Architecture](/docs/architecture) for the daemon internals.
