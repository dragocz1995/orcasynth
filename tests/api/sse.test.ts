import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/api/sse.js';

describe('EventBus', () => {
  it('fans out emitted signals to subscribers and unsubscribes', () => {
    const bus = new EventBus(); const got: any[] = [];
    const off = bus.subscribe(e => got.push(e));
    bus.emit('orca-A', { type: 'working' });
    off();
    bus.emit('orca-A', { type: 'complete' });
    expect(got).toEqual([{ type: 'signal', session: 'orca-A', signal: { type: 'working' } }]);
  });
});
