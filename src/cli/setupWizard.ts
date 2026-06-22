import * as p from '@clack/prompts';
import { buildSetupPlan, applySetup, type SetupAnswers } from './setup.js';

const PROVIDERS: Record<string, string> = {
  OpenAI: 'https://api.openai.com/v1',
  Anthropic: 'https://api.anthropic.com/v1',
};

/** Interactive first-run wizard: collect admin creds + LLM provider/key/model and persist them
 *  through the daemon API at `base`. Shared by the launcher menu and `orca install`. Returns the
 *  admin credentials on success (so the caller can run a login smoke test), or null if the operator
 *  cancelled. Throws only on an API failure (caller reports it). */
export async function runSetupWizard(base: string): Promise<{ username: string; password: string } | null> {
  const username = await p.text({ message: 'Admin username', initialValue: 'admin' });
  if (p.isCancel(username)) return null;
  const password = await p.password({ message: 'Admin password', validate: (v) => ((v ?? '').length < 4 ? 'At least 4 characters' : undefined) });
  if (p.isCancel(password)) return null;

  const choice = await p.select({
    message: 'LLM provider',
    options: [...Object.keys(PROVIDERS).map((k) => ({ value: k, label: k })), { value: 'Custom', label: 'Custom (enter URL)' }],
  });
  if (p.isCancel(choice)) return null;
  let apiUrl = PROVIDERS[choice as string] ?? '';
  if (choice === 'Custom') {
    const custom = await p.text({ message: 'API base URL', placeholder: 'https://…/v1' });
    if (p.isCancel(custom)) return null;
    apiUrl = custom;
  }
  const apiKey = await p.password({ message: 'API key (leave blank to set later in the web UI)' });
  if (p.isCancel(apiKey)) return null;
  const model = await p.text({ message: 'Default model', initialValue: 'gpt-4o-mini' });
  if (p.isCancel(model)) return null;

  const answers: SetupAnswers = { username, password, apiUrl, apiKey, model };
  const s = p.spinner();
  s.start('Saving…');
  try {
    await applySetup(fetch, base, buildSetupPlan(answers));
    s.stop('Admin account created.');
    return { username, password };
  } catch (e) {
    s.stop(`Setup failed: ${(e as Error).message}`);
    throw e;
  }
}
