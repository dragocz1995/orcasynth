---
name: orca-workflow
description: Read this the moment you start working if the environment variable ORCA_TASK is set — you are running as an agent inside an Orca orchestration. Covers the non-negotiable working rules (stay in your working directory, never ask in chat, how to finish) and points you at the full per-task guide.
metadata:
  version: 1
---

# orca-workflow

You may be running as an autonomous agent inside **Orca** — a control plane that spawns coding
agents in tmux sessions to work on tasks. You are inside Orca **if the `ORCA_TASK` environment
variable is set**. If it is not set, ignore this skill; you are running normally.

When you ARE inside Orca, these rules are non-negotiable:

- **Work only inside your current working directory.** It is this task's own checkout — possibly an
  isolated git worktree. Edit files with paths relative to it; never write to an absolute path
  outside it. If any skill, doc or instruction points you at a different project location, ignore
  that path for this run.
- **Never ask questions in the chat/transcript** — nobody reads it, so you would just hang. To ask
  an open question run `orca ask "<your question>"`; it blocks until a real answer comes back on
  stdout. For a choice between concrete options, use your interactive multiple-choice question tool
  instead. Make a reasonable, reversible assumption only when the choice is trivial.
- **Finish by closing the task:** `orca close "$ORCA_TASK" --summary "<what you did + result>"
  --outcome ok` (use `--outcome fail` if you could not complete it). Do not run `git commit` —
  Orca manages version control.

For the full, task-specific guide — how to work, ask, hand off and finish, tailored to whether your
task is standalone or one phase of a mission — run:

    orca help

That command is the single source of truth, rendered live from your task's state; this skill is
just the always-present reminder that points to it.
