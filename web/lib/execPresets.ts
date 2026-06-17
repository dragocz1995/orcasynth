export const EXEC_PRESETS: { label: string; exec: string }[] = [
  { label: 'Claude Sonnet', exec: 'sonnet' },
  { label: 'DeepSeek v4 Flash', exec: 'ollama/deepseek-v4-flash' },
  { label: 'Kimi k2.7 Code', exec: 'ollama/kimi-k2.7-code' },
  { label: 'Minimax m2.7', exec: 'ollama/minimax-m2.7' },
  { label: 'Codex gpt-5.4', exec: 'codex:gpt-5.4' },
];

/** Returns preset models merged with custom models, deduplicated by exec. Custom models override preset labels on conflict. */
export function allModels(custom: { label: string; exec: string }[] = []): { label: string; exec: string }[] {
  const customExecs = new Set(custom.map((m) => m.exec));
  const presets = EXEC_PRESETS.filter((p) => !customExecs.has(p.exec));
  return [...presets, ...custom];
}
