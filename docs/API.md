# API Reference

The Orca daemon exposes a REST API on port 4400. All endpoints return JSON. The API supports CORS for the web frontend.

**Base URL:** `http://localhost:4400`

---

## Health

```http
GET /health
```

**Response `200`**
```json
{ "ok": true }
```

---

## Tasks

### List tasks

```http
GET /tasks
```

**Response `200`**
```json
[
  {
    "id": "my-project-a1b2c3d4",
    "project_id": 1,
    "title": "Implement login page",
    "type": "task",
    "status": "open",
    "priority": "P2",
    "labels": [],
    "parent_id": null,
    "created_at": "2026-06-17 12:00:00"
  }
]
```

### Create task

```http
POST /tasks
Content-Type: application/json

{
  "title": "Add dark mode",
  "type": "task",
  "priority": "P3",
  "id": "my-project-custom-id"
}
```

All fields except `title` are optional. If `id` is omitted, one is generated as `<project-slug>-<random-hex>`.

**Response `201`**
```json
{
  "id": "my-project-custom-id",
  "project_id": 1,
  "title": "Add dark mode",
  "type": "task",
  "status": "open",
  "priority": "P3",
  "labels": [],
  "parent_id": null,
  "created_at": "2026-06-17 12:00:00"
}
```

### Get task

```http
GET /tasks/:id
```

**Response `200`**
```json
{
  "id": "my-project-a1b2c3d4",
  "title": "Implement login page",
  "status": "in_progress",
  "labels": ["exec:claude-code"]
}
```

Returns `null` body with 200 if the task doesn't exist.

### Update task

```http
PATCH /tasks/:id
Content-Type: application/json

{ "status": "in_progress" }
```

Only `status` updates trigger SSE events. Returns the updated task.

**Response `200`**
```json
{ "id": "my-project-a1b2c3d4", "status": "in_progress", ... }
```

### List ready tasks

```http
GET /tasks/ready
```

Returns tasks whose dependencies are all fulfilled. Accepts optional `?limit=N` query parameter.

**Response `200`**
```json
[
  { "id": "task-1", "title": "Fix header", "status": "open", ... }
]
```

---

## Sessions

### List sessions

```http
GET /sessions
```

Returns tmux session names from the host.

**Response `200`**
```json
["orca-Agent0", "orca-Agent42"]
```

### Spawn session

```http
POST /sessions
Content-Type: application/json

{
  "taskId": "my-project-a1b2c3d4",
  "exec": "sonnet"
}
```

`exec` must be in the configured `allowedExecs` list. Creates a tmux session named `orca-<agentName>`, sets the task status to `in_progress`, and launches the agent.

**Response `201`**
```json
{ "session": "orca-Agent0" }
```

**Error `400`**
```json
{ "error": "exec not allowed" }
```

### Stream session output

```http
GET /sessions/:name/stream
```

Server-Sent Events stream of the tmux pane content. Polls every second.

```
event: pane
data: {"pane": "\u001b[0m\u001b[1m>\u001b[0m \u001b[32morca\u001b[0m ..."}
```

The stream stays alive even if the session dies (returns empty frames).

### Kill session

```http
DELETE /sessions/:name
```

**Response `200`**
```json
{ "ok": true }
```

### Send keys

```http
POST /sessions/:name/keys
Content-Type: application/json

{ "keys": ["y", "Enter"] }
```

Sends keystrokes to the tmux session (e.g., to approve agent prompts).

**Response `200`**
```json
{ "ok": true }
```

### Capture pane

```http
GET /sessions/:name/pane
```

Returns the last 60 lines of the session's tmux pane.

**Response `200`**
```json
{ "pane": "> orca ready\n1. Fix header\n2. Add footer\n" }
```

---

## Missions

### List active missions

```http
GET /missions
```

**Response `200`**
```json
[
  {
    "id": "m-epic-1",
    "epic_id": "epic-1",
    "autonomy": "L2",
    "max_sessions": 1,
    "cleared_guardrails": "schema,test",
    "state": "active",
    "started_at": "2026-06-17 12:00:00"
  }
]
```

### Create mission (engage)

```http
POST /missions
Content-Type: application/json

{
  "epicId": "epic-1",
  "autonomy": "L2",
  "maxSessions": 1,
  "clearedGuardrails": ["schema"]
}
```

Triggers an immediate `tick` cycle after creation.

**Response `201`**
```json
{
  "id": "m-epic-1",
  "epic_id": "epic-1",
  "autonomy": "L2",
  "max_sessions": 1,
  "cleared_guardrails": "schema",
  "state": "active",
  "started_at": "2026-06-17 12:00:00"
}
```

### Pause / Resume mission

```http
PATCH /missions/:id
Content-Type: application/json

{ "action": "pause" }
```

Actions: `pause` | `resume`

`resume` triggers an immediate tick cycle.

**Response `200`**
```json
{ "id": "m-epic-1", "state": "paused", ... }
```

### Disengage mission

```http
DELETE /missions/:id
```

Sets state to `disengaged` and kills all associated agent sessions.

**Response `200`**
```json
{ "ok": true }
```

---

## Config

### Get config

```http
GET /config
```

**Response `200`**
```json
{
  "allowedExecs": ["sonnet", "codex:gpt-5.4", "ollama/deepseek-v4-flash"],
  "autopilot": {
    "model": "mimo-v2.5",
    "apiUrl": "https://ai.coresynth.io/v1",
    "apiKeySet": false
  }
}
```

### Update config

```http
PUT /config
Content-Type: application/json

{
  "allowedExecs": ["sonnet"],
  "autopilot": { "apiKey": "sk-..." }
}
```

All fields are partial — only specified fields are updated.

**Response `200`**
```json
{ "allowedExecs": ["sonnet"], "autopilot": { ... } }
```

---

## Events (SSE)

```http
GET /events
```

Server-Sent Events stream for real-time updates. Events are published by the daemon when state changes occur.

### Event types

**task**
```
event: task
data: {"type": "task", "taskId": "my-project-a1b2c3d4", "status": "in_progress"}
```

**mission**
```
event: mission
data: {"type": "mission", "missionId": "m-epic-1", "state": "active"}
```

**signal** (from deriver)
```
event: signal
data: {"type": "signal", "session": "orca-Agent0", "signal": {"type": "working"}}
```

Signal types: `working`, `needs_input`, `complete`.

---

## Status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (invalid input, exec not allowed) |
| `404` | Not found |
| `500` | Internal error |

## Error format

```json
{ "error": "exec not allowed" }
```
