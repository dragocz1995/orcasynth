'use client';
import { useState, useEffect, useRef } from 'react';
import { UserCog, Mail, Cpu, Upload, ShieldCheck, Save, User as UserIcon } from 'lucide-react';
import { useMe, useConfig } from '../../lib/queries';
import { useUpdateMe, useUploadAvatar } from '../../lib/mutations';
import { allModels } from '../../lib/execPresets';
import { Avatar } from '../../components/ui/Avatar';
import { ModelIcon } from '../../components/ui/ModelIcon';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SettingCard } from '../../components/ui/SettingCard';
import { ModuleHeader } from '../../components/ui/ModuleHeader';
import { LoadingState } from '../../components/ui/states';
import { useToast } from '../../components/ui/Toast';
import { useTranslation } from '../../lib/i18n';

export function AccountView() {
  const me = useMe();
  const { data: config } = useConfig();
  const updateMe = useUpdateMe();
  const uploadAvatar = useUploadAvatar();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultExec, setDefaultExec] = useState('');

  useEffect(() => {
    if (me.data?.user) {
      setName(me.data.user.name);
      setEmail(me.data.user.email);
      setDefaultExec(me.data.user.default_exec);
    }
  }, [me.data]);

  if (me.isLoading || !me.data) {
    return <><ModuleHeader title={t.account.title} icon={UserCog} /><LoadingState /></>;
  }

  const u = me.data.user;
  const custom = config?.customModels ?? [];
  // Models the user may pick a default from: their admin allow-list, or all globally-allowed when
  // they have no per-user restriction.
  const restricted = u.allowed_execs.length > 0;
  const pickable = restricted ? u.allowed_execs : (config?.allowedExecs ?? []);
  const labelOf = (exec: string) => allModels(custom).find((m) => m.exec === exec)?.label ?? exec;

  const save = () => updateMe.mutate(
    { name: name.trim(), email: email.trim(), default_exec: defaultExec },
    { onSuccess: () => toast(t.account.saved), onError: (e) => toast(String(e) || t.account.saveError, 'error') },
  );
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAvatar.mutate(f, { onSuccess: () => toast(t.account.avatarSaved), onError: (er) => toast(String(er) || t.account.saveError, 'error') });
    e.target.value = ''; // allow re-selecting the same file
  };

  return (
    <>
      <ModuleHeader title={t.account.title} icon={UserCog}>
        <Button variant="accent" icon={Save} onClick={save} disabled={updateMe.isPending}>{t.account.save}</Button>
      </ModuleHeader>

      <div className="flex max-w-2xl flex-col gap-4">
        {/* Identity + avatar upload */}
        <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5">
          <Avatar user={u} size={64} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold text-text">{u.name || u.username}</span>
              {u.is_admin ? <Badge tone="accent"><ShieldCheck size={11} className="mr-1" aria-hidden />{t.users.admin}</Badge> : null}
            </span>
            <span className="truncate font-mono text-xs text-text-muted">@{u.username}</span>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
          <Button variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()} disabled={uploadAvatar.isPending}>{t.account.uploadAvatar}</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingCard title={t.account.name} icon={UserIcon}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </SettingCard>
          <SettingCard title={t.account.email} icon={Mail}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </SettingCard>
        </div>

        <SettingCard title={t.account.defaultModel} description={restricted ? t.account.restrictedHint : t.account.defaultModelHint} icon={Cpu}>
          {pickable.length === 0 ? (
            <p className="text-xs text-text-muted">{t.account.noModelLimit}</p>
          ) : (
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              {pickable.map((exec) => {
                const on = defaultExec === exec;
                return (
                  <button
                    key={exec}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={labelOf(exec)}
                    onClick={() => setDefaultExec(on ? '' : exec)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${on ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border bg-elevated text-text-muted hover:border-border-strong hover:text-text'}`}
                    style={{ transitionDuration: 'var(--motion-fast)' }}
                  >
                    <ModelIcon name={exec} size={15} />{labelOf(exec)}
                  </button>
                );
              })}
            </div>
          )}
        </SettingCard>
      </div>
    </>
  );
}
