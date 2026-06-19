import { describe, it, expect } from 'vitest';
import { taskTypeMeta, TASK_TYPES, PRIORITIES } from '../../../modules/tasks/taskMeta';

describe('taskTypeMeta', () => {
  it('maps known types to a label and tone', () => {
    expect(taskTypeMeta('bug').label).toBe('Bug');
    expect(taskTypeMeta('bug').tone).toBe('danger');
    expect(taskTypeMeta('epic').label).toBe('Epic');
  });
  it('falls back for unknown types without throwing', () => {
    const meta = taskTypeMeta('whatever');
    expect(meta.label).toBe('whatever');
    expect(meta.icon).toBeTruthy();
  });
  it('defaults to task when type is undefined', () => {
    expect(taskTypeMeta(undefined).label).toBe('Task');
  });
  it('exposes the type and priority option lists', () => {
    expect(TASK_TYPES).toContain('feature');
    expect(PRIORITIES).toEqual(['P0', 'P1', 'P2', 'P3']);
  });
});
