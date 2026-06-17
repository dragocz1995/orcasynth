import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { TopBar } from '../../../components/shell/TopBar';
import { createWrapper } from '../../test-utils';

const server = setupServer(http.get('http://localhost:4400/health', () => HttpResponse.json({ ok: true })));
beforeAll(() => server.listen()); afterAll(() => server.close());

describe('TopBar', () => {
  it('shows the daemon as up when /health is ok', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><TopBar /></Wrapper>);
    await waitFor(() => expect(screen.getByLabelText('daemon up')).toBeInTheDocument());
  });
});
