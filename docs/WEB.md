# Web UI

Next.js 16 frontend at `web/`. Built with React 19, Tailwind CSS 4, TanStack React Query, and Xterm.js.

## Pages

### Dashboard `/dash`

Overview screen with:

- **Stat cards** — open tasks, in progress, blocked, live sessions, active missions
- **Status bar** — visual breakdown of task states
- **Tasks table** — recent tasks with status badges
- **Sessions list** — active agent sessions
- **Missions list** — active missions with state

Data refreshes on mount and via real-time SSE events.

### Tasks `/tasks`

Full task management:

- **Create task form** — title, optional type and priority
- **Task table** — all tasks with ID, title, status badge
- **Actions per task:**
  - `ExecutorPicker` — launch agent with selected model/executor
  - `Close` button — mark task as closed
- States: loading, error (with retry), empty

### Missions `/missions`

Mission lifecycle management:

- **Engage form** — create mission with epic ID, autonomy level (L0–L3), max sessions, cleared guardrails
- **Mission list** — each with ID, autonomy badge, action buttons
- **Actions per mission:**
  - `Detail` — opens modal with `MissionProgressView`
  - `Pause` / `Resume` — toggle mission state
  - `Disengage` — kill all associated sessions and end mission
- **Modal** — `MissionProgressView` shows detailed progress per mission

### Sessions `/sessions`

Live agent session management:

- **Session list** — all `orca-*` tmux sessions
- **Actions per session:**
  - `Terminal` — opens modal with live Xterm.js terminal
  - `Send input` — send keystrokes (e.g., approve prompts)
  - `Interrupt` — send Ctrl+C
  - `Kill` — terminate tmux session
- **Terminal modal** — real-time pane stream via SSE, ANSI color support

### Settings `/settings`

Daemon configuration:

- **Models** — toggle allowed executors (checkboxes per model preset)
  - Claude Sonnet, DeepSeek v4 Flash, Kimi k2.7 Code, Minimax m2.7, Codex gpt-5.4
- **Autopilot** — decision model settings
  - Model name, API URL, API key (masked input)

## Architecture

```
web/
├── app/                    Next.js App Router
│   ├── layout.tsx          Root layout with Geist fonts
│   ├── providers.tsx       React Query provider
│   ├── page.tsx            Root redirect (/)
│   ├── dash/page.tsx       Dashboard
│   ├── tasks/page.tsx      Task management
│   ├── missions/page.tsx   Mission management
│   ├── sessions/page.tsx   Session management
│   └── settings/page.tsx   Settings
├── components/             Reusable UI components
│   ├── control/            Form controls (CreateTask, Engage, ExecutorPicker, SendInput)
│   ├── shell/              App shell (Sidebar, Nav, Layout)
│   ├── terminal/           Xterm.js terminal component
│   └── ui/                 Primitive components (Badge, Button, Modal, Panel, Table, Toast, etc.)
├── lib/                    Client-side logic
│   ├── orcaClient.ts       API client (fetch wrapper)
│   ├── queries.ts          React Query hooks (useTasks, useSessions, etc.)
│   ├── mutations.ts        Mutation hooks (useSpawn, useEngage, etc.)
│   ├── types.ts            TypeScript types
│   ├── useSessionStream.ts SSE hook for terminal pane stream
│   ├── useOrcaEvents.ts    SSE hook for real-time cache invalidation
│   └── execPresets.ts      Model/executor presets
├── modules/                Feature modules
│   ├── dashboard/          Dashboard view + metrics
│   ├── kanban/             Kanban board (drag-and-drop task moves)
│   ├── missions/           Mission progress view
│   ├── sessions/           Session module meta
│   ├── settings/           Settings meta + theme CSS
│   └── tasks/              Task module meta
```

## Key patterns

### Real-time updates

Two SSE connections:

1. **Pane stream** (`/sessions/:name/stream`) — per-session terminal content, 1-second poll
2. **Event bus** (`/events`) — global state changes (task/mission/signal events)

The event bus triggers cache invalidation in React Query — no manual refetching needed.

### State handling

Every data-fetching page handles three states consistently:

- **Loading** — `LoadingState` spinner component
- **Error** — `ErrorState` with retry button ("orca daemon unreachable")
- **Empty** — `EmptyState` with contextual message ("No tasks", "No live sessions")

### Terminal component

Uses `@xterm/xterm` with `@xterm/addon-fit`:

- Black background, no cursor blink
- Auto-fits on container resize via `ResizeObserver`
- Deferred first fit to animation frame for correct initial sizing
- Deduplicated frame updates (same frame → no re-render)

### Sidebar

Resizable, collapsible sidebar with:

- Navigation groups: **Operate** (Dashboard, Tasks, Kanban, Sessions, Missions) and **Config** (Settings)
- Daemon health indicator (green/gray dot)
- Collapse toggle button
- Resize handle with drag support
- Auto-collapses on mobile (<768px)

## Running

```bash
cd web
npm install
npm run dev        # development server
npm run build      # production build
npm start          # production server
```

Set `NEXT_PUBLIC_ORCA_URL` to point to the daemon (default: `http://localhost:4400`).

## Tests

```bash
npm test           # Vitest
npm run test:watch
```

Uses MSW for API mocking, Testing Library for component tests.
