---
title: Using Orca
slug: using-orca
order: 3
eyebrow: Guide
---

# Using Orca

A practical tour of the web UI: where everything lives, how to get work done, and how to
step in when an agent needs you. This guide assumes the daemon and web UI are already
running — see [Install](/docs/install) if not.

The dashboard is organized into two nav groups in the sidebar: **Operate** (Dashboard, Stats,
Tasks, Kanban, Sessions, Timeline, Escalations, Projects) and **Configuration** (Editor,
Settings, Users). Your account lives in the sidebar footer.

## First run

The very first time you open the web UI it redirects to an **onboarding wizard** — no login
needed until the first admin exists. It walks you through:

1. **System dependencies** — detects your installed agent CLIs (claude, opencode, codex) and
   tools (node, tmux, git).
2. **Provider binaries** — binary paths and extra CLI args per provider.
3. **Autopilot backend** — Relay (an API key + URL) or CLI Agents (pick a pilot/overseer exec).
4. **Users** — create the first admin account.
5. **Hermes** — optional MCP-server registration for a same-host Hermes instance.

After onboarding you land on the **Dashboard**, signed in. The session is held in a secure
httpOnly cookie — there is no token to copy around.

## The Dashboard

`/dash` is your at-a-glance control room:

- A **needs-input banner** appears at the top whenever an agent is waiting for you.
- **Now** metric cards: open tasks, in progress, blocked, live sessions, active missions.
- **Live agent lanes** — up to six running sessions with a status dot, model icon, and a live
  tail of their output.
- **Quick actions** — *New task* and *New mission*.
- **Active missions** with done/total counts and a capacity meter.
- **Autopilot spotlight** — every active mission's current phase with pause/resume/disengage
  controls.
- **Recent outcomes** — the last closed tasks with an ok/fail badge and result summary.

Press **Ctrl+K** anywhere to open the command palette — jump to any page or create a
task/mission without reaching for the mouse.

## Projects

Before agents can do anything they need a project to work in. Open `/projects`:

- **New project** — give it a slug, a path on disk, and optional pilot notes (conventions the
  planner should know). A **Browse** button opens a server-side folder picker so you don't have
  to type the path.
- Each **project card** shows git status (branch, clean/dirty, ahead/behind).
- **Edit project** lets you change the path, notes, and the per-project PR workflow toggle
  (inherit / on / off). The slug is immutable.
- **Open editor** launches the built-in Monaco code editor (see below).

## Creating a task

A **task** is a single unit of work an agent will pick up. From **Tasks** (`/tasks`) or the
dashboard, click **New task**:

- **Title** and **details** — what you want done.
- **Type** (task / bug / feature / chore) and **priority** (P0–P3).
- **Executor** — which model/agent runs it, picked from brand-icon pills. Leave it on *Default*
  to use the configured fallback.
- **Project** — a row of project pills when you have access to more than one.
- Optional **schedule** (run later), **autostart**, and **dependencies** on other tasks.

Once created, the task appears in the list as a compact card with quick **Start / Stop / Pause**
controls, a live status dot, and a model-icon bubble. Click it to open the detail pane (agent,
token usage, committed changes, handoff notes). **Right-click** any task for a context menu with
run controls, *Set model / priority / status* submenus, dependency management, and lifecycle
actions.

## Running an autopilot mission

A **mission** turns a high-level goal into a chain of phases that agents execute autonomously.
Click **New mission** to open the planning modal:

1. **Goal** — describe the outcome you want.
2. **Autonomy level** — how much rope the autopilot gets (see below).
3. **Max sessions** — how many phases may run in parallel.
4. **PR workflow** — default / on / off for this mission.
5. **Auto-model** — when on, the planner picks the best model per phase from your Settings
   descriptions, and the executor picker is hidden.

When you submit, the **Pilot** decomposes the goal into phases. With a CLI-agent backend you
watch the planner think live in the modal. The mission then appears as an **epic row** in the
Tasks view, with lifecycle pills — **Engage · Pause · Resume · Disengage** — plus PR
link/open/merge actions and a rolled-up cost. Expand the epic to see its phases; click it to
open the mission detail view (a "deployment summary" with the goal, metric pills, and a phase
log).

### Autonomy levels

Pick how much the autopilot does on its own. The Settings autonomy selector shows this same
explainer as you switch levels:

| Level | Behavior |
|---|---|
| **L0 · Recommend** | The Pilot only plans and proposes. Nothing runs until you approve it. |
| **L1 · Assist** | Runs only clear, safe steps on its own. Anything uncertain or sensitive waits for your approval. |
| **L2 · Pilot** | Runs work and clears agent permission prompts itself. Ambiguous or risky situations are escalated to you. |
| **L3 · Auto** | Full autonomy. Runs and clears everything itself, reaching out only when it genuinely cannot decide. |

Destructive operations (`rm -rf`, dropping tables, force-pushes, touching `.env`) always
escalate to a human, whatever the level. See [Concepts](/docs/concepts) for the decision model.

## Watching agents live

**Sessions** (`/sessions`) shows every running agent as a card with a live, ANSI-colored tail of
its terminal. Filter by **All / Needs input**, and switch density between comfortable and compact.
When the deriver detects an agent waiting on a permission prompt, the card shows **Allow / Reject**
buttons right there.

Click a session to open the **full terminal** — a real PTY you type straight into (native cursor,
scrollback, full key support), so you can take over mid-run. Any terminal can be **popped out**
into its own chromeless window for focus.

The **Timeline** (`/timeline`) is a live activity feed across tasks, missions, and signals, with
an axis/swimlane/feed view, a date-range filter, and a **changes-over-time** stream that turns
recent git history into commit cards with a most-active-files roll-up.

## When Orca needs you

Three things pull you back in:

- **Escalations** (`/escalations`) — an inbox of overseer rejections awaiting a decision, each
  with the full rationale. **Approve** releases the review gate so downstream phases continue, or
  **re-run** the rejected phase. Items self-clear once resolved.
- **Needs-input prompts** — surfaced on the dashboard banner, the session card, and the sidebar
  notification bell. Allow or reject inline.
- **Phone push notifications** — opt in per device from your Account, and Orca pings your phone
  only when a mission actually needs you (review escalation, agent waiting on input, a stalled
  run, completion). The notification carries inline **Allow / Reject / Approve / Re-run / Open**
  buttons that act without opening the app.

## The Assistant

The **Assistant** is your own persistent agent that drives Orca on your behalf. It lives in a
docked, IDE-style side panel (dock it left or right, resize it, split it into panes). Start it
with an agent of your choice; it can create tasks, plan missions, list sessions, and reach any
Orca endpoint through a built-in MCP server with exactly your own rights. You can add a
read-write terminal pane onto any running session, so you watch the assistant and a worker side
by side. It auto-starts on login once configured.

## The code editor

**Editor** (`/editor`, or *Open editor* from a project) is a built-in Monaco editor with the
project file tree: open multiple files in tabs, edit and save, see per-file working diffs against
HEAD, view commit diffs, and preview images and rendered markdown. Changed files are highlighted,
and right-click gives you new file/folder, rename, duplicate, and delete.

## Stats

**Stats** (`/stats`) aggregates token and cost usage per model: summary cards (total cost, total
tokens, cache tokens, models used) and a cost-by-model breakdown with proportional bars. Usage is
snapshotted when each task settles, so the page is cheap to load. Admins can reset the snapshots
(your CLI transcripts are never touched).

## Settings

**Settings** (`/settings`, admin-only) is organized into sections:

- **Models** — toggle executor presets and custom models on/off, and click a model's description
  to write its autopilot capability note (used by auto-model).
- **Autopilot** — choose the backend (Relay or CLI Agents), set the planner/overseer models or
  pilot/overseer execs, toggle review-on-done, and edit the planner prompt template. A **Test
  plan** button runs a dry-run decomposition.
- **GitHub** — the PR-native workflow: token, default base branch, auto-open, verify command,
  and a `gh` auth status banner.
- **Providers** — per-program binary paths and extra args, a skip-permissions toggle, and a
  resume-sessions toggle (a re-spawned agent continues its prior CLI session).
- **Defaults** — default executor, autonomy level, max sessions, and login token TTL.
- **Hermes** — one-click MCP-server registration for a same-host Hermes.
- **System** — current version, update posture (with an auto-update toggle and *Update now*),
  and live health cards for the daemon and web service.
- **Data** — the danger zone: delete all tasks/missions/activity (keeps projects, users,
  settings).

## Users & your account

**Users** (`/users`, admin-only) manages accounts: toggle the admin role, assign users to
projects (their access boundary), and restrict which models a non-admin may run.

**Account** (sidebar footer) is yours: pick a default model, upload an avatar, set your name and
email, change your password, toggle phone push per device, and adjust the per-device UI scale.

## Language & theme

The whole UI ships full **English and Czech** localization — toggle the language in the sidebar
footer. The theme is a flat, OLED-friendly dark design, responsive down to a phone, with the
sidebar collapsing to an overlay on small screens.

---

That's the tour. Next: [Concepts](/docs/concepts) for how it all works under the hood, the
[CLI](/docs/cli) for driving Orca from a terminal, and [Architecture](/docs/architecture) for the
daemon internals.
