'use client';
import { useEffect, useState } from 'react';
import { Save, Boxes, Bot, SlidersHorizontal, Trash2, Plus } from 'lucide-react';
import { useConfig } from '../../lib/queries';
import { useUpdateConfig } from '../../lib/mutations';
import { EXEC_PRESETS, allModels } from '../../lib/execPresets';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Section } from '../../components/ui/Section';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Toggle } from '../../components/ui/Toggle';
import { Segmented } from '../../components/ui/Segmented';
import { SettingCard } from '../../components/ui/SettingCard';
import { LoadingState, ErrorState } from '../../components/ui/states';
import { ModuleShell } from '../../components/shell/ModuleShell';
import '../../modules/settings/theme.css';

const inputClass = 'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted transition-colors focus:border-accent';

const PRESET_EXECS = new Set(EXEC_PRESETS.map((p) => p.exec));

export default function SettingsPage() {
  const config = useConfig();
  const update = useUpdateConfig();
  const { toast } = useToast();

  const [allowed, setAllowed] = useState<string[]>([]);
  const [customModels, setCustomModels] = useState<{ label: string; exec: string }[]>([]);
  const [model, setModel] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [notes, setNotes] = useState('');

  const [defExec, setDefExec] = useState('');
  const [defAutonomy, setDefAutonomy] = useState('');
  const [defMaxSessions, setDefMaxSessions] = useState(1);

  // Add-model form state
  const [addLabel, setAddLabel] = useState('');
  const [addExec, setAddExec] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (config.data) {
      setAllowed(config.data.allowedExecs);
      setCustomModels(config.data.customModels ?? []);
      setModel(config.data.autopilot.model);
      setApiUrl(config.data.autopilot.apiUrl);
      setNotes(config.data.autopilot.notes);
      setDefExec(config.data.defaults.exec);
      setDefAutonomy(config.data.defaults.autonomy);
      setDefMaxSessions(config.data.defaults.maxSessions);
    }
  }, [config.data]);

  if (config.isLoading) return <ModuleShell moduleId="settings"><PageHeader title="Settings" /><LoadingState /></ModuleShell>;
  if (config.isError) return <ModuleShell moduleId="settings"><PageHeader title="Settings" /><ErrorState message="orca daemon unreachable" onRetry={() => config.refetch()} /></ModuleShell>;

  const toggle = (exec: string) => setAllowed((prev) => prev.includes(exec) ? prev.filter((e) => e !== exec) : [...prev, exec]);
  const apiKeySet = config.data?.autopilot.apiKeySet;

  const deleteCustomModel = (exec: string) => {
    setCustomModels((prev) => prev.filter((m) => m.exec !== exec));
    setAllowed((prev) => prev.filter((e) => e !== exec));
  };

  const addCustomModel = () => {
    const label = addLabel.trim();
    const exec = addExec.trim();
    if (!label || !exec) return;
    setCustomModels((prev) => [...prev, { label, exec }]);
    setAddLabel('');
    setAddExec('');
    setShowAddForm(false);
  };

  const saveModels = () =>
    update.mutate(
      { allowedExecs: allowed, customModels },
      { onSuccess: () => toast('Models saved'), onError: (e) => toast(String(e), 'error') },
    );

  const models = allModels(customModels);

  return (
    <ModuleShell moduleId="settings">
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Settings" />

        <Section
          title="Models"
          icon={Boxes}
          actions={
            <Button variant="accent" icon={Save} onClick={saveModels}>
              Save models
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((p) => {
              const isCustom = !PRESET_EXECS.has(p.exec);
              return (
                <SettingCard key={p.exec} title={p.label} description={p.exec}>
                  <div className="flex items-center gap-2">
                    <Toggle checked={allowed.includes(p.exec)} onChange={() => toggle(p.exec)} label={p.label} />
                    {isCustom && (
                      <IconButton
                        icon={Trash2}
                        label={`Delete ${p.exec}`}
                        variant="danger"
                        onClick={() => deleteCustomModel(p.exec)}
                      />
                    )}
                  </div>
                </SettingCard>
              );
            })}
          </div>

          <div className="mt-4">
            {showAddForm ? (
              <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-muted">Label</span>
                  <input
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="My Model"
                    className={inputClass}
                    aria-label="New model label"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-muted">Exec</span>
                  <input
                    value={addExec}
                    onChange={(e) => setAddExec(e.target.value)}
                    placeholder="provider/model-name"
                    className={inputClass}
                    aria-label="New model exec"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="accent" icon={Plus} onClick={addCustomModel} disabled={!addLabel.trim() || !addExec.trim()}>
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowAddForm(false); setAddLabel(''); setAddExec(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" icon={Plus} onClick={() => setShowAddForm(true)}>
                Add model
              </Button>
            )}
          </div>
        </Section>

        <Section
          title="Autopilot"
          icon={Bot}
          actions={
            <Button variant="accent" icon={Save} onClick={() => update.mutate({ autopilot: { model, apiUrl, notes, ...(apiKey ? { apiKey } : {}) } }, { onSuccess: () => { toast('Autopilot saved'); setApiKey(''); }, onError: (e) => toast(String(e), 'error') })}>
              Save autopilot
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingCard title="Decision model" description="LLM the autopilot uses to plan">
              <input value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} />
            </SettingCard>
            <SettingCard title="OpenAI API URL" description="OpenAI-compatible endpoint">
              <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className={inputClass} />
            </SettingCard>
            <SettingCard title="API key" description={apiKeySet ? 'A key is set — leave blank to keep' : 'Stored server-side, never returned'}>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={apiKeySet ? '•••• set' : 'paste key'} className={inputClass} />
            </SettingCard>
            <SettingCard title="Notes" description="Guidance the autopilot follows" icon={undefined}>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
            </SettingCard>
          </div>
        </Section>

        <Section
          title="Defaults"
          icon={SlidersHorizontal}
          actions={
            <Button variant="accent" icon={Save} onClick={() => update.mutate({ defaults: { exec: defExec, autonomy: defAutonomy, maxSessions: defMaxSessions } }, { onSuccess: () => toast('Defaults saved'), onError: (e) => toast(String(e), 'error') })}>
              Save defaults
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingCard title="Executor" description="Default agent for new launches">
              <Segmented options={EXEC_PRESETS.map((p) => ({ value: p.exec, label: p.exec }))} value={defExec} onChange={setDefExec} />
            </SettingCard>
            <SettingCard title="Autonomy" description="Default mission autonomy level">
              <Segmented options={['L0', 'L1', 'L2', 'L3'].map((l) => ({ value: l, label: l }))} value={defAutonomy} onChange={setDefAutonomy} />
            </SettingCard>
            <SettingCard title="Max sessions" description="Concurrent agents per mission">
              <input type="number" min={1} value={defMaxSessions} onChange={(e) => setDefMaxSessions(Number(e.target.value))} className={inputClass} />
            </SettingCard>
          </div>
        </Section>
      </div>
    </ModuleShell>
  );
}
