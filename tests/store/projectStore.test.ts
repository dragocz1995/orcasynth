import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../../src/store/db.js';
import { ProjectStore } from '../../src/store/projectStore.js';

let store: ProjectStore;
beforeEach(() => { store = new ProjectStore(openDb(':memory:')); });

describe('ProjectStore', () => {
  it('creates, lists and gets projects with notes', () => {
    const p = store.create({ slug: 'web', path: '/var/www/web', notes: 'the frontend' });
    expect(p.id).toBeGreaterThan(0);
    expect(p.notes).toBe('the frontend');
    expect(store.get(p.id)?.slug).toBe('web');
    expect(store.list().map((x) => x.slug)).toContain('web');
  });
  it('defaults notes to empty and rejects duplicate slug', () => {
    const p = store.create({ slug: 'a', path: '/a' });
    expect(p.notes).toBe('');
    expect(() => store.create({ slug: 'a', path: '/b' })).toThrow();
  });
});
