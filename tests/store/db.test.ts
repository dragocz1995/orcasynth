import { describe, it, expect } from 'vitest';
import { openDb } from '../../src/store/db.js';

describe('openDb', () => {
  it('applies schema (tables exist) on a fresh :memory: db', () => {
    const db = openDb(':memory:');
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
    expect(names).toEqual(expect.arrayContaining(['projects', 'tasks', 'task_deps', 'agents', 'missions']));
  });
});
