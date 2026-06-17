import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import SettingsPage from '../../app/settings/page';
import { ToastProvider } from '../../components/ui/Toast';
import { createWrapper } from '../test-utils';

let putBody: unknown = null;
const server = setupServer(
  http.get('*/config', () => HttpResponse.json({ allowedExecs: ['sonnet', 'codex:gpt-5.4'], customModels: [], autopilot: { model: 'mimo-v2.5', apiUrl: 'https://ai.coresynth.io/v1', apiKeySet: false, notes: '' }, defaults: { exec: 'sonnet', autonomy: 'L1', maxSessions: 1 } })),
  http.put('*/config', async ({ request }) => { putBody = await request.json(); return HttpResponse.json({ allowedExecs: ['sonnet'], customModels: [], autopilot: { model: 'mimo-v2.5', apiUrl: 'https://ai.coresynth.io/v1', apiKeySet: false, notes: '' }, defaults: { exec: 'sonnet', autonomy: 'L1', maxSessions: 1 } }); }),
);
beforeAll(() => server.listen()); afterEach(() => server.resetHandlers()); afterAll(() => server.close());

describe('SettingsPage', () => {
  it('loads config and saves a changed model allowlist', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><ToastProvider><SettingsPage /></ToastProvider></Wrapper>);
    await waitFor(() => expect(screen.getByLabelText('Claude Sonnet')).toBeChecked());
    fireEvent.click(screen.getByLabelText('Claude Sonnet')); // uncheck sonnet
    fireEvent.click(screen.getByRole('button', { name: 'Save models' }));
    await waitFor(() => expect((putBody as { allowedExecs: string[] }).allowedExecs).not.toContain('sonnet'));
  });

  it('Save models sends customModels in the PUT body', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><ToastProvider><SettingsPage /></ToastProvider></Wrapper>);
    await waitFor(() => expect(screen.getByLabelText('Claude Sonnet')).toBeChecked());
    fireEvent.click(screen.getByRole('button', { name: 'Save models' }));
    await waitFor(() => expect((putBody as { customModels: unknown }).customModels).toBeDefined());
    expect(Array.isArray((putBody as { customModels: unknown[] }).customModels)).toBe(true);
  });

  it('renders the Add model affordance', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><ToastProvider><SettingsPage /></ToastProvider></Wrapper>);
    await waitFor(() => expect(screen.getByLabelText('Claude Sonnet')).toBeChecked());
    expect(screen.getByRole('button', { name: 'Add model' })).toBeTruthy();
  });

  it('add-model form appears on click and sends customModels with the new entry on save', async () => {
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><ToastProvider><SettingsPage /></ToastProvider></Wrapper>);
    await waitFor(() => expect(screen.getByLabelText('Claude Sonnet')).toBeChecked());

    fireEvent.click(screen.getByRole('button', { name: 'Add model' }));
    fireEvent.change(screen.getByLabelText('New model label'), { target: { value: 'My Custom Model' } });
    fireEvent.change(screen.getByLabelText('New model exec'), { target: { value: 'my/custom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    // The new model card should now be in the DOM
    await waitFor(() => expect(screen.getByLabelText('My Custom Model')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Save models' }));
    await waitFor(() => {
      const body = putBody as { customModels: { label: string; exec: string }[] };
      expect(body.customModels).toContainEqual({ label: 'My Custom Model', exec: 'my/custom' });
    });
  });
});

const config = { allowedExecs: ['sonnet'], customModels: [], autopilot: { model: 'm', apiUrl: 'u', apiKeySet: false, notes: 'mind the guardrails' }, defaults: { exec: 'sonnet', autonomy: 'L3', maxSessions: 2 } };

describe('Settings depth', () => {
  it('renders model toggles and a defaults segmented control', async () => {
    server.use(http.get('*/config', () => HttpResponse.json(config)));
    const { wrapper: Wrapper } = createWrapper();
    render(<Wrapper><ToastProvider><SettingsPage /></ToastProvider></Wrapper>);
    expect(await screen.findByDisplayValue('mind the guardrails')).toBeTruthy(); // notes textarea still present
    expect(screen.getAllByRole('switch').length).toBeGreaterThan(0);            // model toggle cards
    expect(screen.getAllByRole('radiogroup').length).toBeGreaterThan(0);        // defaults segmented (autonomy/exec)
  });
});
