'use client';
import { Terminal } from './Terminal';
import { TerminalControls } from './TerminalControls';
import { useSendInput, useKillSession } from '../../lib/mutations';
import { useToast } from '../ui/Toast';

export function TerminalPanel({ name, onKilled }: { name: string; onKilled?: () => void }) {
  const send = useSendInput();
  const kill = useKillSession();
  const { toast } = useToast();
  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <Terminal name={name} />
      </div>
      <TerminalControls
        busy={kill.isPending}
        onSendKeys={(keys) =>
          send.mutate({ name, keys }, { onError: (e) => toast(String(e), 'error') })
        }
        onKill={() =>
          kill.mutate(name, {
            onSuccess: () => { toast(`Killed ${name}`); onKilled?.(); },
            onError: (e) => toast(String(e), 'error'),
          })
        }
      />
    </div>
  );
}
