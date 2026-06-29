---
title: Architecture
slug: architecture
order: 6
eyebrow: Reference
---

# Architecture

Orca is a self-hosted AI agent orchestration daemon. It manages a queue of tasks, spawns AI
coding agents in isolated tmux sessions, and monitors their progress. A **Next.js dashboard**
(`web/`) drives everything over the HTTP API. Daemon code is plain TypeScript
(Hono + `better-sqlite3`), no framework magic.

## Core runtime

```
bootstrap → open DB → instantiate stores/services → create Hono server → startup reconcile → start loops
```

The daemon starts a set of independent timer loops:

| Loop | Interval | Purpose |
|---|---|---|
| Overseer (engine tick) | 90 s | Tick active missions: pick ready tasks, spawn agents |
| Scheduler | 30 s | Launch due scheduled/autostart tasks |
| Janitor | 60 s | Kill zombie tmux sessions whose task is already closed/cancelled |
| Stuck detector | 60 s | Revert tasks whose agent died without `orca close` (bounded), escalate after the relaunch budget |
| Deriver | 5 s | Poll tmux panes, detect agent state, auto-approve known prompts |
| Overseer watchdog | 60 s | Re-park missing overseer agents for active/stalled missions (crash recovery) |
| Token purge | 1 h | Delete expired auth tokens |
| Event purge | 1 h | Drop `events` rows past the retention window |
| Ticket sweep | 60 s | Sweep expired terminal-WS single-use tickets |
| PR feedback | 60 s | Poll open PRs for fresh actionable review feedback, re-engage the mission with fix phases |

### Startup reconcile

On boot the daemon runs two one-shot recovery passes before the loops start:

1. **Zombie reconcile** — tasks left `in_progress` whose tmux session is gone are reverted to
   `open`. No grace or relaunch counter: a restart isn't an agent death, so it shouldn't spend
   the budget.
2. **Overseer reconcile** — when an agent overseer is configured, re-park one per active
   mission (their sessions died with the daemon) and kill orphan overseer sessions whose
   mission is no longer active.

### VAPID keypair generation

On every boot the daemon checks for an existing web-push VAPID keypair in the config store. If
none exists (first boot) it generates one and persists the public + private keys. The public
key is exposed for browser subscription; the private key stays in the config store, never
served via the API.

## Request / spawn flow

```
HTTP request
  → api/server.ts (route handler, auth via Bearer token)
  → overseer/missionEngine.ts (mission tick: pick ready tasks)  OR  overseer/scheduler.ts (scheduled/autostart)
  → spawn/spawn.ts  SpawnService.launch()
  → spawn/commandBuilder.ts  buildAgentCommand()  (cd + env + cli + prompt)
  → tmux/driver.ts  spawn()  →  tmux new-session  (session = orca-<agentName>)
```

The agent works in the tmux pane, then calls `orca close <taskId>` back to the daemon to mark
its task done.

## Modules

| Module | Responsibility |
|---|---|
| `src/daemon` | Entry point + DI container: opens the DB, instantiates all services, starts the timer loops |
| `src/api` | Hono REST server, SSE event bus, Bearer-token auth middleware |
| `src/terminal` | Real-PTY WebSocket streaming (`node-pty` + `tmux attach`) for the dock and pop-out terminals |
| `src/advisor` | Per-user assistant lifecycle (start/stop/autostart) + per-program MCP config injection |
| `src/mcp` | Built-in stateless MCP server exposing Orca's toolset to the assistant |
| `src/overseer` | Mission engine, planner, scheduler, decision engine, stuck detector, janitor, session classifier, checkout gating |
| `src/spawn` | Agent command building + per-program session resume strategies |
| `src/deriver` | Derives signals from agent output (`working` / `needs_input` / `complete`) |
| `src/tmux` | tmux driver abstraction (real + fake) |
| `src/store` | SQLite stores (tasks, missions, agents, config, users, projects, events, notes, usage) |
| `src/inference` | LLM relay client (OpenAI-compatible) + fake for tests |
| `src/git` | Reads git status, branches, and recent commits for project paths |
| `src/integrations` | Per-executor usage extraction, project file editor, CLI detection, git worktree + GitHub PR helpers |
| `src/push` | Web-push notifications (VAPID, dispatcher, sender, recipient resolution) |
| `src/prompts` | Markdown prompt-template renderer with `{{placeholder}}` substitution |
| `src/cli` | The `orca` CLI client |
| `src/shared` | Clock, executor metadata, the shared REST API core, the per-checkout keyed mutex |
| `web/modules` | Web feature modules (tasks, kanban, sessions, timeline, projects, advisor, settings, …) |

## Data layer

SQLite with WAL mode (`better-sqlite3`). Key tables:

| Table | Purpose |
|---|---|
| `projects` | Registered projects |
| `tasks` | Task queue (tree structure via `parent_id`) |
| `task_deps` | Task dependencies (DAG) |
| `agents` | Agent session registry (per-project unique names) |
| `missions` | Mission definitions, autonomy level |
| `settings` | Daemon configuration (JSON blob) |
| `users` | User accounts (scrypt hashes, admin flag, per-user exec allow-list, advisor settings) |
| `auth_tokens` | Session tokens for bearer auth (scope: full / agent / advisor) |
| `events` | Activity event log (state changes, signals) |
| `notes` | Inter-agent handoff notes |
| `task_usage` | Persisted per-task token/cost snapshots (written once when a task settles) |
| `user_push_subscriptions` | Per-user web-push device subscriptions |
| `mission_pr` | PR-native workflow state (branch, worktree, PR number, review feedback, fix rounds) |
| `user_projects` | User ↔ project assignments (RBAC many-to-many) |

## Shared-checkout concurrency model

Non-PR phases share one project checkout. Two agents running there concurrently would
interleave `git add -A` over a neighbor's edits or straddle `base..HEAD` across another's
commit, mis-attributing changes. Three cooperating pieces prevent this:

1. **Per-checkout async mutex (`KeyedMutex`)** — a FIFO lock keyed by checkout path. The
   spawn-time baseline read and the close-time commit+snapshot run under this lock so they
   never interleave. PR worktrees are per-mission isolated, so they use their own key and
   cross-checkout parallelism is preserved.
2. **Single-writer gate (`checkoutBusy` / `busySharedCheckouts`)** — before launching an
   agent into a shared checkout, the scheduler, mission engine, and manual spawn all check
   whether another in-progress task already occupies it. The in-progress list is read **fresh**
   immediately before the claim, and the task is flipped to `in_progress` **synchronously**
   (no `await` between check and flip) so the check-and-claim is atomic across concurrent ticks.
3. **Launch-gate ordering** — the task is flipped to `in_progress` *before* the first await,
   so a concurrent tick computing the occupied set can't miss it and double-occupy.

## Real-PTY terminal streaming

The terminal module streams a true PTY (a `tmux attach` via `node-pty`) over a WebSocket to
the browser's xterm, for the assistant dock, the enlarged-modal terminals, and the pop-out
window. The WebSocket reaches the daemon directly, so it carries no session cookie — a
short-lived single-use **ticket** is the capability, minted by an authenticated, ownership-gated
endpoint. `node-pty` is an **optional dependency**: when it can't load, the previews fall back
to a read-only snapshot mirror.

## Autonomy levels

| Level | Name | Auto-spawn | Prompt gate | Confidence bar |
|---|---|---|---|---|
| L0 | Recommend | Never | Always escalate to human | — |
| L1 | Assist | Yes | Overseer gate (stricter) | 0.85 |
| L2 | Pilot | Yes | Overseer gate (standard) | 0.6 |
| L3 | Auto | Yes | Overseer gate (standard) | 0.6 |

L1 differs from L2 not in *whether* prompts are gated (both route through the overseer) but in
the **confidence threshold**. L3 additionally waves non-destructive prompts through when no
overseer is configured at all. See [Concepts](/docs/concepts) for the full decision model.

## Data flow

```
                                    ┌───────────┐
                                    │   Client   │
                                    │ (CLI/Web)  │
                                    └─────┬─────┘
                                          │ HTTP/SSE
                                          ▼
                               ┌──────────────────┐
                               │   Hono Server    │
                               │   port 4400      │
                               └──────┬───────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      ┌──────────────┐      ┌──────────────────┐     ┌──────────────┐
      │  TaskStore   │      │  MissionEngine   │     │   EventBus   │
      │  (CRUD)      │      │  (90s tick)      │     │  (SSE push)  │
      └──────┬───────┘      └──────┬───────────┘     └──────────────┘
             │                     │
             │            ┌────────▼────────┐
             │            │    Routing      │
             │            │ (resolveExecutor)│
             │            └────────┬────────┘
             │                     │
             │            ┌────────▼────────┐
             │            │  SpawnService   │
             │            │  (tmux launch)  │
             │            └────────┬────────┘
             │                     │
             │            ┌────────▼────────┐
             │            │    Deriver      │
             │            │  (5s poll loop) │
             │            └────────┬────────┘
             ▼                     ▼
      ┌──────────────────────────────────────┐
      │           SQLite (WAL)               │
      │  tasks / missions / agents / users   │
      └──────────────────────────────────────┘
```

## Access control / multi-tenancy

Three token scopes govern what an API caller may do:

| Scope | Purpose |
|---|---|
| `full` | Interactive user session — bounded by the user's role and project assignments |
| `agent` | Spawned agent — restricted to a narrow allow-list of verbs and confined to its live working set |
| `advisor` | Per-user assistant — mapped to `full` rights but isolated from login tokens |

With a multi-user store present, a global middleware rejects non-admins not assigned to the
daemon's project, per-route checks gate item operations and project file/git endpoints, and a
per-user model allow-list restricts which exec a non-admin may use. Admins and single-user mode
pass everything unrestricted.

## Testing

Tests use Vitest with fake implementations — `FakeTmuxDriver` (in-memory sessions), `FakeClock`
(deterministic time), and `FakeInference` (predictable LLM responses) — so the full
integration-style suite runs without real tmux or network dependencies. The daemon and web
suites both run in CI on every push and PR.

---

The full reference docs live on
[GitHub](https://github.com/dragocz1995/orcasynth/tree/main/docs). See also
[Concepts](/docs/concepts) and the [CLI reference](/docs/cli).
