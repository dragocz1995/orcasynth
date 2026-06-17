import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { TimelineView } from '../../../modules/timeline/TimelineView';
import { createWrapper } from '../../test-utils';

const server = setupServer(http.get('*/activity', () => HttpResponse.json([
  { id: 3, ts: '2026-06-17 12:50:00', type: 'task', target: 'orca-x', detail: 'closed' },
  { id: 2, ts: '2026-06-17 12:10:00', type: 'mission', target: 'm1', detail: 'active' },
])));
beforeAll(() => server.listen()); afterEach(() => server.resetHandlers()); afterAll(() => server.close());

describe('TimelineView', () => {
  it('renders the activity feed rows', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><TimelineView /></Wrapper>);
    expect(await screen.findByText('orca-x')).toBeTruthy();
    expect(screen.getByText('m1')).toBeTruthy();
  });

  it('renders axis tick labels', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><TimelineView /></Wrapper>);
    // Wait for data to load so the axis renders with real events
    await screen.findByText('orca-x');
    const ticks = screen.getAllByTestId('axis-tick');
    expect(ticks.length).toBe(12);
    // Each tick label matches HH:MM
    for (const tick of ticks) {
      expect(tick.textContent).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('renders dot markers for events in the window', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><TimelineView /></Wrapper>);
    await screen.findByText('orca-x');
    const dots = screen.getAllByTestId('axis-dot');
    // Both fixture events have timestamps within last 12h of "now"
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });
});
