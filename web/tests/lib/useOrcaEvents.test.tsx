import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useOrcaEvents } from '../../lib/useOrcaEvents';

class FakeES {
  static last: FakeES;
  onerror: (() => void) | null = null;
  closed = false;
  private listeners = new Map<string, ((e: { data: string }) => void)[]>();
  constructor(public url: string) { FakeES.last = this; }
  addEventListener(type: string, fn: (e: { data: string }) => void) {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(type, [...existing, fn]);
  }
  close() { this.closed = true; }
  emit(obj: Record<string, unknown>) {
    const handlers = this.listeners.get(obj['type'] as string) ?? [];
    for (const fn of handlers) fn({ data: JSON.stringify(obj) });
  }
}

beforeEach(() => { (globalThis as unknown as { EventSource: unknown }).EventSource = FakeES; });

function wrap() {
  const client = new QueryClient();
  const spy = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, spy, wrapper };
}

describe('useOrcaEvents', () => {
  it('invalidates tasks on a task event and ignores malformed payloads', () => {
    const { spy, wrapper } = wrap();
    renderHook(() => useOrcaEvents(), { wrapper });
    FakeES.last.emit({ type: 'task', taskId: 'orca-1', status: 'closed' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    // malformed payload — must not throw, must be silently skipped
    FakeES.last.addEventListener('task', () => { /* no-op listener to ensure no throw */ });
    const fakeHandler = FakeES.last['listeners' as keyof FakeES] as unknown as Map<string, ((e: { data: string }) => void)[]>;
    const taskHandlers = fakeHandler.get('task') ?? [];
    expect(() => taskHandlers[0]?.({ data: 'not json' })).not.toThrow();
  });
  it('closes the source on unmount', () => {
    const { wrapper } = wrap();
    const { unmount } = renderHook(() => useOrcaEvents(), { wrapper });
    const es = FakeES.last; unmount();
    expect(es.closed).toBe(true);
  });
});
