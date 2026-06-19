import type { Db } from './db.js';
import type { Task } from './types.js';

type Row = Omit<Task, 'labels'> & { labels: string };

export class Readiness {
  private blockedStmt;
  private getStmt;

  constructor(private db: Db) {
    this.blockedStmt = this.db.prepare(
      `SELECT COUNT(*) AS n FROM task_deps d JOIN tasks t ON t.id = d.depends_on_id
       WHERE d.task_id = ? AND t.status NOT IN ('closed','cancelled')`
    );
    this.getStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
  }

  ready(projectId: number): Task[] {
    const open = this.db.prepare(
      "SELECT id FROM tasks WHERE project_id = ? AND status = 'open' AND type != 'epic' ORDER BY created_at"
    ).all(projectId) as { id: string }[];
    const toTask = (r: Row): Task => ({ ...r, labels: r.labels ? r.labels.split(',').filter(Boolean) : [] });
    return open
      .filter(o => (this.blockedStmt.get(o.id) as { n: number }).n === 0)
      .map(o => toTask(this.getStmt.get(o.id) as Row));
  }
}
