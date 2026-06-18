# UX Proposals — Agent Awareness & Autopilot First-Class

> **Scope:** Web UI only (`/var/www/orca/web`). Proposals grounded in the
> existing codebase (`DashboardView`, `MissionsView`, `TasksView`, `EpicGroup`,
> `KanbanBoard`, `KanbanEpicCard`, `TaskDetailPane`, `OpsStatusBar`,
> `Sidebar`, `lib/agentUtils.ts`, `lib/taskTree.ts`).
>
> **Design constraints:** OLED/black Vercel-clean, no gradients, no glows.
> Reuse existing tokens from `web/app/globals.css`. Respect the existing HTTP
> API; backend-dependent items are flagged *optional* with exact data needed.
>
> **Deliverable:** proposals only — no code changes.

## Current state snapshot

- The UI already shows: live state dot, model icon, agent name, elapsed time,
  one-line live tail, outcome badge, blocker reason, and epic progress ribbons.
- Shared components exist: `AgentStatusDot`, `AgentIdentityStrip`,
  `TaskContextLine`, `OutcomeBadge`, `NeedsInputBanner`, `ProgressRibbon`.
- Helper logic exists: `liveState`, `epicLive`, `epicProgress`, `taskElapsed`,
  `tailSnippet`, `taskBlockers`.
- Available data today: task `id`, `title`, `status`, `type`, `labels` (incl.
  `agent:<name>`, `exec:<model>`), `parent_id`, `result_summary`, `outcome`,
  timestamps; live tmux sessions list; per-session SSE signals (`working`,
  `needs_input`, `complete`); missions (`id`, `epic_id`, `autonomy`,
  `max_sessions`, `state`); mission detail (tasks + deps + progress counts);
  activity log (`events` table records `task`, `mission`, `signal` events only).
- **What is missing:** no stall detection, no time-in-phase, no token/cost
  counts, no per-agent recent decisions/change summary, no confidence/health
  score, no dedicated autopilot surface beyond collapsible epic rows.

---

## 1. Surface more important agent info at a glance

### P0.1 — Stall/stuck detection: "silent for N minutes" badge

**What's missing today:** A task can be `in_progress` with a live tmux
session yet produce no new pane output for a long time. The UI currently
shows only a green working dot, so a stuck agent looks identical to a busy
one.

**Proposal:** Add a "silent for ` Xm`" indicator on running task cards and in
the dashboard live lanes. If the last pane update was older than a threshold
(default 5 min), replace the green pulse with an amber warning dot + elapsed
silence time. Over 15 min turns danger red and surfaces in the ops status bar
as a new "stuck" count.

**Where it lives:**
- New helper `useSessionStall.ts` (or extend `lib/agentUtils.ts`):
  compares the latest `tail` hash / `activity` timestamp to `Date.now()`.
- `TaskCard.tsx` live-state area (reuse `AgentStatusDot` with new `stalled`
  state).
- `DashboardView.tsx` `LiveLane` and the hero metric strip.
- `OpsStatusBar.tsx` add a "stuck" badge next to needs-attention.

**Rough effort:** S.

**Data needed:** No new API — derive from the existing 2 s pane poll in
`useSessionPane` plus a local timestamp of the last content change. Can also
read the most recent `signal` or `activity` event for the session.

---

### P0.2 — Time-in-phase / phase ETA for epic children

**What's missing today:** The epic progress ribbon shows "3/7 done" but the
operator has no sense of *how long the current phase has been running* or
*when the epic might finish*. `taskElapsed` only measures total task lifetime.

**Proposal:** On epic/phase cards and in the mission workspace, show:
1. **Time in phase** — elapsed since the phase entered `in_progress`.
2. **Average phase duration** — median of already-closed phases in the same
   epic.
3. **ETA** — based on closed-phase average × remaining phases (optional,
   clearly marked as rough).

**Where it lives:**
- Extend `lib/agentUtils.ts` with `phaseDuration(task, nowMs)` and
  `epicPhaseStats(children)`.
- `EpicGroup.tsx` header next to `done/total`.
- `KanbanEpicCard.tsx` header.
- `MissionsView.tsx` mission workspace metric strip.
- `TaskDetailPane.tsx` for a selected phase.

**Rough effort:** S.

**Data needed:** No new API — derive from existing `created_at`, `closed_at`,
and `status` timestamps of sibling phases. If a phase re-enters
`in_progress`, lifetime becomes misleading; optional backend change to stamp
`started_at` would improve accuracy (see P2).

---

### P0.3 — "What just changed" diff line on live task cards

**What's missing today:** `TaskContextLine` shows the newest tail line, but
not whether the agent is editing files, running tests, waiting for a prompt,
or looping. The operator must open the terminal to infer intent.

**Proposal:** Derive a one-word activity category from the tail text using
lightweight regex patterns (already used by the deriver in
`src/deriver/shellPatterns.ts`). Categories: `editing`, `testing`, `building`,
`installing`, `thinking`, `prompted`, `error`. Render as a tiny badge + verb
next to the tail line, e.g. `testing · vitest run …`.

**Where it lives:**
- New helper `lib/sessionActivity.ts` (pattern matching only, no backend).
- `TaskContextLine.tsx` — replace or augment `LiveTailLine`.
- `DashboardView.tsx` `LiveLane` tail snippet.
- `SessionCard.tsx` tail header.

**Rough effort:** S.

**Data needed:** No new API — inspect the same pane text already fetched by
`useSessionPane`. Keep patterns minimal and client-side.

---

### P1.1 — Per-agent recent decisions log

**What's missing today:** When an L2/L3 mission auto-clears a permission
prompt, the operator only sees the final signal (`working`). The fact that
an overseer approved/rejected something, or that a destructive operation was
escalated, is invisible in the UI.

**Proposal:** Add a compact "recent decisions" strip inside `TaskDetailPane`
for running/in-progress tasks. Each decision shows: timestamp, question
snippet, action (`approved` / `rejected` / `escalated`), and model used. Link
back to the session timeline row.

**Where it lives:**
- `TaskDetailPane.tsx` under the live tail.
- Reuse `OutcomeBadge` / `Badge` tones for decision outcomes.
- New optional query `useDecisions(taskId)` if backend data added.

**Rough effort:** M.

**Data needed:** **Optional backend change.** The overseer/decision layer
exists (`src/overseer/decision.ts`) but does not appear to persist decisions.
Need: a `decisions` table (or enriched `events` row) with `task_id`,
`question`, `context`, `approved`, `destructive`, `model`, `ts`. Expose via
`GET /tasks/:id/decisions` or embed in `MissionDetail`.

---

### P1.2 — Health/confidence score per live agent

**What's missing today:** There is no aggregate "is this agent healthy?"
signal. A working agent could be in a tight error loop, repeatedly failing
commands, or stuck retrying.

**Proposal:** Compute a simple health score from signals the UI already has:
- Output velocity (lines/time).
- Error-pattern frequency in tail.
- Time since last signal event.
- Whether the task is `needs_input`.
Render as a 4-state badge: `healthy`, `slow`, `stuck`, `blocked`, placed on
the `SessionCard` and dashboard lane.

**Where it lives:**
- New helper `lib/sessionHealth.ts` deriving score from pane + SSE state.
- `SessionCard.tsx` header.
- `DashboardView.tsx` `LiveLane`.
- `TaskCard.tsx` when running.

**Rough effort:** M.

**Data needed:** No new API — purely client-side derivation from pane text,
signal history, and `in_progress` duration. Best if the SSE bus later emits
 richer signal metadata (line count, error count) to avoid polling cost.

---

### P2.1 — Token / cost / turn counts (optional, backend-powered)

**What's missing today:** Orca has no visibility into agent spend. For an
operator running many agents this is a major blind spot.

**Proposal:** When available, show a tiny cost strip per running task:
`~$0.04 · 12 turns · 4.2k tokens`. On the epic/mission level, aggregate
across phases. Put a small "spend" widget in the context rail of missions.

**Where it lives:**
- `TaskCard.tsx` footer, `SessionCard.tsx` footer.
- `EpicGroup.tsx` / `KanbanEpicCard.tsx` header.
- `MissionsView.tsx` workspace.

**Rough effort:** L.

**Data needed:** **Optional backend change.** The CLIs (claude-code,
opencode, codex) do not currently report usage to Orca. Need: the agent
processes (or a proxy) to emit usage events; a new `usage` table or field
on tasks/events (`turns`, `input_tokens`, `output_tokens`, `cost_usd`); and
an endpoint to read it. Without backend data this proposal is blocked — keep
as a flagged future item.

---

## 2. Make "Autopilot" a first-class category

### P0.4 — Dedicated "Autopilot" filter + mode in Tasks

**What's missing today:** Tasks view filters by status (`in_progress`,
`open`, etc.) but has no filter for "show me the autopilot epics and their
running phases". Epics are mixed in with normal tasks, and phases are hidden
inside collapsed parents.

**Proposal:** Add a top-level filter toggle `Autopilot` in `TasksView`
that, when active:
- Shows only `type === 'epic'` rows.
- Auto-expands epics that are active (running/needs-input/blocked).
- Sorts active epics to the top, then recently updated.
- Add a badge on each row showing `autonomy` + `max_sessions` if a mission
  exists for the epic.

**Where it lives:**
- `TasksView.tsx` filter bar (extend `Segmented` or add a second toggle).
- `EpicGroup.tsx` — accept an `autoExpandWhenActive` prop.
- `lib/taskTree.ts` — add `activeEpics(tasks, childMap)` helper.

**Rough effort:** S.

**Data needed:** No new API — uses existing `type`, `parent_id`, `status`,
and the missions list (already fetched).

---

### P0.5 — Dashboard autopilot spotlight section

**What's missing today:** Dashboard shows missions as a compact mini-list in
the lower section, mixed with recent tasks. Active autopilot missions get no
visual priority over ordinary recent tasks.

**Proposal:** Give active autopilot missions a dedicated **spotlight hero**
below the live-sessions hero. For each active mission show:
- Epic title (large).
- Phase ribbon (existing `ProgressRibbon`).
- Current phase name + model + live state dot.
- `X of Y phases · autonomy · maxSessions`.
- Quick pause/resume/disengage controls.

If no mission is active, collapse to a single CTA row: `Engage an autopilot
mission`.

**Where it lives:**
- New component `modules/dashboard/AutopilotSpotlight.tsx`.
- `DashboardView.tsx` hero area or immediately below it.
- Reuse `useMissions`, `useTasks`, `useSessionSignals`, `ProgressRibbon`,
  `IconButton`, `Badge`.

**Rough effort:** S.

**Data needed:** No new API — all data already fetched on dashboard.

---

### P0.6 — Mission detail: current-phase spotlight + next-up indicator

**What's missing today:** `MissionsView` workspace shows the DAG and a
selected-task pane, but does not highlight *which phase is currently running*
or *which phase will run next* in a single-glance way.

**Proposal:** Add a **phase spotlight bar** at the top of the mission
workspace:
- Left: "Current" — running phase title + agent + live dot.
- Center: arrow + "Next" — first ready open phase (title only).
- Right: pause/resume + disengage.
Clicking current/next scrolls the DAG to the node and opens its detail pane.

**Where it lives:**
- New component `modules/missions/PhaseSpotlight.tsx`.
- `MissionsView.tsx` `MissionWorkspace`, above the DAG.
- Reuse existing task/session lookups.

**Rough effort:** S.

**Data needed:** No new API — derive from mission detail tasks + deps +
signals.

---

### P1.3 — Autopilot epic roster card

**What's missing today:** An autopilot epic is visually just a bordered
collapsible row with a progress ribbon. It does not communicate that it is a
*mission* with its own agent roster and autonomy level.

**Proposal:** Redesign `EpicGroup` and `KanbanEpicCard` when a mission is
engaged:
- Prominent top hairline in `accent/40` (or `warning` when paused, `danger`
  when blocked).
- Inline autonomy badge (`L2 · Pilot`) and `max_sessions` chip.
- Mini "roster" of active/ready phases as a horizontal row of tiny model
  icons + status dots (like a GitHub PR check row).
- Hover/expand reveals the current phase spotlight line.

**Where it lives:**
- `EpicGroup.tsx` and `KanbanEpicCard.tsx` — add a `mission` prop.
- New small component `components/ui/AgentRoster.tsx`.
- `MissionsView.tsx` left-rail mission cards can reuse the same treatment.

**Rough effort:** M.

**Data needed:** No new API — missions list already fetched; match by
`epic_id`.

---

### P1.4 — Missions list becomes a "mission control" rail

**What's missing today:** The left rail in `MissionsView` is a grouped list
of missions. It is functional but does not feel like a control surface.

**Proposal:** Turn the left rail into a **mission control rail**:
- Each mission card shows a live aggregate state: `running`, `needs_input`,
  `blocked`, `paused`, `done`.
- A compact phase ribbon replaces the text `done/total`.
- Active mission card gets a left accent border + `bg-accent/[0.06]`.
- Pause/resume/disengage controls are always visible on the active card,
  not only on hover.
- Add a "focus" toggle that filters the DAG to only the selected mission
  (already single-select, but make the visual contract stronger).

**Where it lives:**
- `MissionsView.tsx` left rail markup.
- Reuse `ProgressRibbon`, `AgentStatusDot`, `IconButton`, `ActionMenu`.

**Rough effort:** M.

**Data needed:** No new API.

---

### P2.2 — Dedicated `/autopilot` route (optional)

**What's missing today:** There is no page whose sole purpose is "show me
all autopilot activity". Dashboard, Tasks, and Missions each show a slice.

**Proposal:** Add a new top-level route `/autopilot` that combines:
- Active missions spotlight (cards).
- Queue of upcoming ready phases across all missions.
- Recently completed phases + outcomes.
- Global autopilot health: active missions, total live agents, needs-input
  count, stuck count.
- Quick controls to pause/resume/disengage or engage a new mission.

This becomes the operator's primary landing page when they are in
"autopilot oversight" mode; keep the existing Dashboard for a broader
overview.

**Where it lives:**
- `web/app/autopilot/page.tsx` (thin shell).
- `web/modules/autopilot/AutopilotView.tsx`.
- Add to `modules/registry.ts` and i18n dictionaries.
- Reuse `EpicGroup`, `ProgressRibbon`, `PhaseSpotlight`, `NeedsInputBanner`,
  `OpsStatusBar` patterns.

**Rough effort:** L.

**Data needed:** No new API — composes existing `/tasks`, `/missions`,
`/sessions`, `/events`. Optional backend: `/missions?include=disengaged` if
we want to show completed missions (currently `/missions` only returns
`active`).

---

## 3. General UX / polish wins

### P0.7 — Sessions page: sort needs-input to top + persist density

**What's missing today:** `SessionsView` shows all sessions in the order
returned by `/sessions`. A session waiting for input can be buried in the
grid. The density toggle is not persisted.

**Proposal:**
1. Sort sessions by signal priority: `needs_input` first, then `working`,
   then idle/complete.
2. Persist `comfortable`/`compact` in `localStorage` under `orca.sessions.density`.
3. Add a count badge to the filter toggle.

**Where it lives:**
- `SessionsView.tsx` sorting + `useState` → `useLocalStorage`.
- `SessionCard.tsx` already exposes `compact`.

**Rough effort:** S.

**Data needed:** No new API.

---

### P0.8 — Task detail pane: sticky actions + copy task id

**What's missing today:** In `TaskDetailPane`, the action buttons and task
identity scroll with the content. On long descriptions or big live tails,
the primary controls are lost. The task id is visible but not copyable.

**Proposal:**
1. Make the identity + action row sticky at the top of the detail pane with
   a subtle bottom border on scroll.
2. Add a copy-id button next to the task id (already a monospace label).
3. Keep the terminal button prominent when a session exists.

**Where it lives:**
- `TaskDetailPane.tsx` layout refactor.
- Reuse `IconButton` with a new clipboard icon; toast on copy.

**Rough effort:** S.

**Data needed:** No new API.

---

### P0.9 — Mobile: swipe-able drawer tabs + live lane accordion

**What's missing today:** Mobile uses a hamburger drawer (`Sidebar.tsx`),
but once open the operator sees the same desktop nav. The dashboard live
lanes and the ops status bar do not have a compact mobile-specific layout.

**Proposal:**
1. In the mobile drawer, replace the static daemon dot block with a compact
   **live pulse strip**: live count, needs-input count, stuck count, next
   ready task.
2. On the dashboard, collapse the live lanes into an accordion: header
   shows `3 running · 1 needs input`, tap to expand lanes.
3. On missions, the left rail becomes a bottom sheet picker on mobile,
   freeing the screen for the DAG.

**Where it lives:**
- `Sidebar.tsx` mobile block.
- `DashboardView.tsx` conditional live-lane accordion.
- `MissionsView.tsx` responsive rail/sheet.

**Rough effort:** S.

**Data needed:** No new API.

---

### P1.5 — Empty states with contextual CTAs

**What's missing today:** Several empty states lack a primary action. The
user must look elsewhere to create a task or engage a mission.

**Proposal:** Audit and upgrade empty states for:
- Dashboard zero live agents → `New task` + `New mission` buttons.
- Tasks empty → `New task` + `Plan with Autopilot`.
- Missions empty → `Engage mission` button.
- Sessions empty → `Go to tasks` link.

**Where it lives:**
- `components/ui/states.tsx` `EmptyState` already accepts `action`.
- `DashboardView.tsx`, `TasksView.tsx`, `MissionsView.tsx`, `SessionsView.tsx`.

**Rough effort:** S.

**Data needed:** No new API.

---

### P1.6 — Consistent hover/focus language across cards

**What's missing today:** Not all cards use `.card-interactive`. Some have
bespoke hover classes or no lift at all (e.g. dashboard recent-task rows,
mission rail cards). This makes the app feel piecemeal.

**Proposal:** Apply `.card-interactive` (or a new `.row-interactive` without
lift for dense rows) to every clickable card/row. Ensure focus rings are
visible on mission rail cards and dashboard lanes.

**Where it lives:**
- `DashboardView.tsx` `LiveLane`, recent-task rows.
- `MissionsView.tsx` mission rail cards.
- `TasksView.tsx` task rows if a row variant is introduced.
- `globals.css` optional `.row-interactive` utility.

**Rough effort:** S.

**Data needed:** No new API.

---

### P1.7 — Keyboard shortcuts page + ⌘K integration

**What's missing today:** There is no visible keyboard help, and the
command palette is not deeply integrated with the new surfaces (e.g. no
"pause active mission" command).

**Proposal:**
1. Add a small `?` keyboard-help trigger in the module header that opens a
   modal listing shortcuts.
2. Extend the command palette with actions for: pause/resume current
   mission, open first needs-input session, engage last epic, copy selected
   task id.
3. Show shortcut hints inline on icon buttons.

**Where it lives:**
- `components/shell/CommandPalette.tsx`.
- New `components/shell/KeyboardHelp.tsx`.
- `ModuleHeader.tsx` optional help trigger.

**Rough effort:** M.

**Data needed:** No new API.

---

### P2.3 — Cross-link graph: agent ↔ task ↔ mission ↔ session

**What's missing today:** Cross-links exist (task↔session, task↔mission via
`?select=`), but they are scattered and not systematic. For example, from a
session card you can open the task, but from the task card you cannot jump
to the parent epic/mission.

**Proposal:** Establish a single cross-link convention:
- Session card → task, task → session, task → parent epic/mission,
- Mission workspace → current phase + session, epic row → mission.
- Use a consistent "↗" icon + `Link` component; never require the user to
  remember where related data lives.

**Where it lives:**
- `TaskCard.tsx`, `TaskDetailPane.tsx`, `SessionCard.tsx`, `EpicGroup.tsx`,
  `MissionsView.tsx`.

**Rough effort:** M.

**Data needed:** No new API.

---

## Summary table

| Proposal | Priority | Effort | Files / Components | Needs backend? |
|---|---|---|---|---|
| P0.1 Stall/stuck detection | P0 | S | `useSessionPane`, `AgentStatusDot`, `TaskCard`, `DashboardView`, `OpsStatusBar` | No |
| P0.2 Time-in-phase / ETA | P0 | S | `lib/agentUtils.ts`, `EpicGroup`, `KanbanEpicCard`, `MissionsView`, `TaskDetailPane` | Optional (`started_at`) |
| P0.3 Activity category badge | P0 | S | `lib/sessionActivity.ts`, `TaskContextLine`, `DashboardView`, `SessionCard` | No |
| P0.4 Autopilot filter in Tasks | P0 | S | `TasksView`, `EpicGroup`, `lib/taskTree.ts` | No |
| P0.5 Dashboard autopilot spotlight | P0 | S | `DashboardView`, new `AutopilotSpotlight` | No |
| P0.6 Mission phase spotlight | P0 | S | `MissionsView`, new `PhaseSpotlight` | No |
| P0.7 Sessions sort + density persist | P0 | S | `SessionsView`, `SessionCard` | No |
| P0.8 Sticky task actions + copy id | P0 | S | `TaskDetailPane` | No |
| P0.9 Mobile live pulse + accordions | P0 | S | `Sidebar`, `DashboardView`, `MissionsView` | No |
| P1.1 Per-agent decisions log | P1 | M | `TaskDetailPane`, optional `useDecisions` | Optional (`decisions` table) |
| P1.2 Agent health/confidence score | P1 | M | `lib/sessionHealth.ts`, `SessionCard`, `DashboardView`, `TaskCard` | No (optional SSE metadata) |
| P1.3 Autopilot roster card | P1 | M | `EpicGroup`, `KanbanEpicCard`, `AgentRoster`, `MissionsView` | No |
| P1.4 Mission control rail | P1 | M | `MissionsView` left rail | No |
| P1.5 Contextual empty states | P1 | S | `EmptyState` consumers | No |
| P1.6 Consistent card hover/focus | P1 | S | `globals.css`, `DashboardView`, `MissionsView` | No |
| P1.7 Keyboard help + ⌘K actions | P1 | M | `CommandPalette`, `KeyboardHelp`, `ModuleHeader` | No |
| P2.1 Token/cost/turn counts | P2 | L | `TaskCard`, `SessionCard`, `EpicGroup`, `MissionsView` | Yes (usage reporting) |
| P2.2 `/autopilot` route | P2 | L | `app/autopilot/page.tsx`, `AutopilotView`, `modules/registry.ts`, i18n | Optional (disengaged missions) |
| P2.3 Cross-link graph | P2 | M | `TaskCard`, `TaskDetailPane`, `SessionCard`, `EpicGroup`, `MissionsView` | No |

---

## Recommended ship order

1. **Week 1 — P0 agent-awareness quick wins:**
   - P0.1 stall detection
   - P0.2 time-in-phase / ETA
   - P0.3 activity category badge
   - P0.7 sessions sort + density
   - P0.8 sticky task actions + copy id
   These make the operator immediately more aware of what agents are doing
   without touching backend data.

2. **Week 1/2 — P0 autopilot first-class:**
   - P0.4 autopilot filter
   - P0.5 dashboard autopilot spotlight
   - P0.6 mission phase spotlight
   - P0.9 mobile live pulse + accordions
   These answer the explicit operator ask to make autopilot feel distinct
   from a pile of tasks.

3. **Week 2 — P1 depth + polish:**
   - P1.3 autopilot roster card
   - P1.4 mission control rail
   - P1.5 contextual empty states
   - P1.6 consistent hover/focus
   - P1.1 decisions log (if backend table is added in parallel)
   - P1.2 health score
   - P1.7 keyboard help

4. **P2 — plan individually:**
   - P2.1 token/cost needs API design first; do not build UI until usage data
     is available.
   - P2.2 `/autopilot` route is a natural capstone once P0/P1 autopilot
     surfaces are validated.
   - P2.3 cross-link graph can ship incrementally alongside each page change.

---

*End of proposal. No application code changed.*
