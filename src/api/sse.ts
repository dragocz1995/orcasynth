import type { SignalSink, DerivedSignal } from '../deriver/types.js';

export type OrcaEvent =
  | { type: 'signal'; session: string; signal: DerivedSignal }
  | { type: 'mission'; missionId: string; state: string }
  | { type: 'task'; taskId: string; status: string };

export class EventBus implements SignalSink {
  private subs = new Set<(e: OrcaEvent) => void>();
  subscribe(fn: (e: OrcaEvent) => void): () => void { this.subs.add(fn); return () => this.subs.delete(fn); }
  publish(e: OrcaEvent): void { for (const fn of this.subs) fn(e); }
  emit(session: string, signal: DerivedSignal): void { this.publish({ type: 'signal', session, signal }); }
}
