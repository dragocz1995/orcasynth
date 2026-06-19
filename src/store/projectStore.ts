import type { Db } from './db.js';

export interface Project { id: number; slug: string; path: string; notes: string }

export class ProjectStore {
  constructor(private db: Db) {}
  create(p: { slug: string; path: string; notes?: string }): Project {
    const info = this.db.prepare('INSERT INTO projects (slug, path, notes) VALUES (?, ?, ?)').run(p.slug, p.path, p.notes ?? '');
    return this.get(Number(info.lastInsertRowid))!;
  }
  list(): Project[] { return this.db.prepare('SELECT * FROM projects ORDER BY id').all() as Project[]; }
  get(id: number): Project | null { return (this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined) ?? null; }
}
