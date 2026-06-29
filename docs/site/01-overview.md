---
title: Overview
slug: overview
order: 1
eyebrow: Getting started
---

# Overview

**Control autonomous coding agents — without losing control.**

Orcasynth is a self-hosted daemon that orchestrates autonomous coding agents
(Claude Code, OpenCode, Codex, Kilo Code, Pi, oh-my-pi) in isolated `tmux` sessions — with
a REST API, a CLI, and a real-time Next.js web UI. No SaaS, no lock-in: your machine, your
agents, your code.

`Plan · Dispatch · Observe · Intervene`

## Why Orcasynth

Coding agents are powerful but messy to run at scale: one terminal per agent, no shared
view of what's happening, and no safety net when an agent decides to `rm -rf` something.

Orcasynth puts a control plane in front of them. Hand it a goal and it plans the work,
spawns the right agent for each step in its own `tmux` session, streams every keystroke to
your browser, and gates dangerous actions behind a human when you want it to. When you
trust it more, you turn the autonomy up; when you trust it less, you turn it down.

## What it does

- **Autopilot planning.** Give the Pilot a goal and an LLM decomposes it into a dependency
  DAG of phases. Phases only start once the phases they depend on are done — and independent
  phases run in parallel up to your session limit, each in its own isolated worktree.
- **Per-model descriptions & per-phase model selection.** Write a capability description
  for each model in Settings, flip on "Autopilot picks the model," and the planner chooses
  the best-suited model for each phase — validated against your allow-list.
- **PR-native autopilot.** Instead of editing your checkout mid-flight, a mission can run
  like a disciplined engineer on a branch: it works in an isolated git worktree, commits each
  approved phase, runs your verify command, pushes the branch, and opens a GitHub pull request.
  PR review feedback flows back to the Pilot as fix phases on the same branch, bounded by a
  fix-round budget so the mission escalates to a human instead of looping forever.
- **Agent-agnostic spawning.** Runs Claude Code, OpenCode, Codex, Kilo Code, Pi, or
  oh-my-pi in isolated `tmux` sessions, configurable per task — as workers *and* as the
  autopilot's Pilot/Overseer. Each provider is a first-class executor with its own brand
  icon and launch flags.
- **Autonomy levels (L0–L3).** Choose how much rope each mission gets — from
  **L0 · Recommend** (plan only, nothing runs until you approve) through **L1 · Assist**
  and **L2 · Pilot** to **L3 · Auto** (full autonomy). The overseer's decision engine
  auto-clears safe permission prompts and escalates anything destructive or uncertain to a
  human. Operations like `rm -rf`, dropping tables, force-pushes, or touching `.env` always
  escalate, whatever the level.
- **Live web UI with one-click intervention.** Tasks, a kanban board with a calendar,
  missions with phase progress, a timeline activity feed, an escalations queue, and real-time
  `tmux` session previews you can jump into and take over. Each preview is a real PTY streamed
  over a WebSocket (xterm), so you type straight into the agent. Full EN/CS internationalization
  built in, responsive down to a phone.
- **Phone push notifications.** Launch a swarm and walk away — Orca pings your phone only when
  a mission actually needs you (review escalation, agent waiting on input, stalled run) with
  inline action buttons that act through the service worker without opening the app.
- **Self-healing.** A stuck-session detector revives agents that die without closing out (and
  blocks the task after repeated failures). A janitor sweeps up finished sessions.
- **Multi-user RBAC with self-service.** Admin and member roles, per-project assignments,
  per-user model allow-lists, profiles and avatars, and a first-run onboarding that needs no
  login until the first admin is created.
- **Per-user Assistant.** Each user gets a persistent assistant agent that drives Orca on their
  behalf through a built-in MCP server, running in a docked IDE-style side panel with a real-PTY
  terminal.
- **Self-hosted & lightweight.** A single SQLite-backed daemon (Hono + SSE) plus a Next.js
  front end. No external services required beyond your own LLM provider.

## How it works

```
        goal
         │
         ▼
   ┌───────────┐   phases + deps    ┌─────────────┐   spawn    ┌──────────────┐
   │   Pilot   │ ─────────────────► │   Overseer  │ ─────────► │  Agent (tmux) │
   │ (planner) │                    │ (scheduler, │            │ Claude Code / │
   └───────────┘                    │  decisions) │ ◄───────── │ OpenCode /    │
                                    └─────────────┘   signals  │ Codex / Kilo /│
                                          │                    │ Pi / oh-my-pi │
                                          │                    └──────────────┘
                                          │ escalate
                                          ▼
                                    human-in-the-loop
```

The **Pilot** decomposes a goal into a dependency-ordered set of phases. The **Overseer**
schedules ready phases, spawns the right **Agent** for each one in its own `tmux` session,
and watches the output. A deriver reads each session and emits signals — `working`,
`needs_input`, `complete`. When an agent hits a permission prompt, the decision engine
either clears it automatically (high confidence, non-destructive, within the mission's
autonomy level) or escalates it to a human.

## Key concepts

- **Tasks** — units of work, tree structure via `parent_id`, dependency DAG via `task_deps`.
- **Missions** — group tasks under an epic with an autonomy level (L0–L3) and a `max_sessions` cap.
- **Autonomy levels** — L0–L3 gate auto-spawn and prompt handling.
- **Overseer** — decision gate: a relay LLM or a parked per-mission agent; supports post-done reviews.
- **Pilot** — repo-aware planning agent; submits phases via `orca plan submit`.
- **Deriver** — polls tmux panes every 5 s, detects agent state, auto-approves via the overseer gate.
- **Event bus** — SSE for real-time UI updates; drives push notifications and usage recording.
- **Assistant** — per-user advisor session driving Orca via a built-in MCP server.

See [Concepts](/docs/concepts) for the full domain model, [Architecture](/docs/architecture)
for the runtime, and [CLI](/docs/cli) for the command reference.

## Next steps

- [Install](/docs/install) — get the daemon and web UI running.
- [Concepts](/docs/concepts) — tasks, missions, autonomy, overseer, deriver.
- [Architecture](/docs/architecture) — modules, timer loops, data flow.

The source lives on GitHub: <https://github.com/dragocz1995/orcasynth>.
