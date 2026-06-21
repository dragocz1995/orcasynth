import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { onUnhandledRequest } from '../../msw';
import { TimelineView } from '../../../modules/timeline/TimelineView';
import { createWrapper } from '../../test-utils';

// Recent timestamps (relative to now) so events land inside the 12h window
// regardless of when the suite runs. Includes a flood of identical signals.
function fixture() {
  const now = Date.now();
  const min = 60 * 1000;
  const flood = Array.from({ length: 4 }, (_, i) => ({
    id: 10 + i,
    ts: new Date(now - 30 * min + i * 5_000).toISOString(),
    type: 'signal',
    target: 'agent-1',
    detail: 'working',
    project_id: null,
  }));
  return [
    { id: 4, ts: new Date(now - 2 * min).toISOString(), type: 'review', target: 'orca-x', detail: 'escalated: missing tests', project_id: 5 },
    { id: 3, ts: new Date(now - 5 * min).toISOString(), type: 'task', target: 'orca-x', detail: 'closed', project_id: 5 },
    { id: 2, ts: new Date(now - 20 * min).toISOString(), type: 'mission', target: 'm1', detail: 'active', project_id: null },
    ...flood,
  ];
}

const server = setupServer(
  http.get('*/activity', () => HttpResponse.json(fixture())),
  http.get('*/projects/:id/changed', () => HttpResponse.json({ changed: ['src/foo.ts'] })),
  http.get('*/projects/:id/changes', () => HttpResponse.json({ diff: '--- a/src/foo.ts\n+++ b/src/foo.ts\n@@ -1 +1 @@\n-old\n+new line here' })),
);
beforeAll(() => server.listen({ onUnhandledRequest })); afterEach(() => server.resetHandlers()); afterAll(() => server.close());

describe('TimelineView', () => {
  it('renders the timeline track tick labels', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><TimelineView /></Wrapper>);
    // Window auto-sizes to the data span (fixture events ~30 min old → short window).
    const ticks = await screen.findAllByTestId('axis-tick');
    expect(ticks.length).toBeGreaterThanOrEqual(1);
    for (const tick of ticks) {
      expect(tick.textContent).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('renders markers for events in the window', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><TimelineView /></Wrapper>);
    const dots = await screen.findAllByTestId('axis-dot');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('opens a drill-down detail with the review rationale and the working diff on marker click', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><TimelineView /></Wrapper>);
    const dots = await screen.findAllByTestId('axis-dot');
    // The review marker carries its verdict in the aria-label.
    const reviewDot = dots.find((d) => d.getAttribute('aria-label')?.includes('escalated'));
    expect(reviewDot).toBeTruthy();
    fireEvent.click(reviewDot!);
    // Drawer shows the verdict rationale…
    expect((await screen.findAllByText(/missing tests/)).length).toBeGreaterThanOrEqual(1);
    // …and pulls the project's working diff (project_id = 5 on the event).
    expect(await screen.findByText(/\+new line here/)).toBeTruthy();
  });

  it('shows summary stats for the window', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><TimelineView /></Wrapper>);
    // A summary strip counts the event kinds in the window.
    expect(await screen.findByTestId('timeline-summary')).toBeTruthy();
  });
});
