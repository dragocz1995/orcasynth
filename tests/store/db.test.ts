import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { openDb } from '../../src/store/db.js';

let dir: string | null = null;
afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); dir = null; });

describe('openDb', () => {
  it('applies schema (tables exist) on a fresh :memory: db', () => {
    const db = openDb(':memory:');
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
    expect(names).toEqual(expect.arrayContaining(['projects', 'tasks', 'task_deps', 'agents', 'missions']));
  });

  it('migrates a pre-project_id events table without throwing (adds the column + index)', () => {
    dir = mkdtempSync(join(tmpdir(), 'orca-db-'));
    const path = join(dir, 'old.db');
    // Simulate a DB created before the project_id column existed: events with the OLD shape.
    const old = new Database(path);
    old.exec("CREATE TABLE events (id INTEGER PRIMARY KEY, ts TEXT NOT NULL DEFAULT (datetime('now')), type TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '')");
    old.prepare("INSERT INTO events (type, target, detail) VALUES ('task','t1','open')").run();
    old.close();
    // Re-opening must run the additive migration cleanly (this used to crash: "no such column: project_id").
    const db = openDb(path);
    const cols = db.prepare('PRAGMA table_info(events)').all().map((r: any) => r.name);
    expect(cols).toContain('project_id');
    // Existing rows survive with a null project, and the project index exists.
    expect((db.prepare("SELECT project_id FROM events WHERE target='t1'").get() as any).project_id).toBeNull();
    const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_events_project'").get();
    expect(idx).toBeTruthy();
  });
});
