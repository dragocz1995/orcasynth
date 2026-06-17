'use client';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Trash2, type LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

/**
 * Global hover/click action menu. Opens on hover (and click for touch), closes on
 * mouse-leave / outside-click / Escape. Default trigger is a red trash icon — pass
 * `trigger` to use a different launcher. Reusable across destructive/contextual actions.
 */
export function ActionMenu({ items, label = 'Actions', trigger, align = 'right' }: {
  items: ActionMenuItem[];
  label?: string;
  trigger?: ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-danger/60 text-danger transition-colors hover:bg-danger hover:text-white"
        style={{ transitionDuration: 'var(--motion-fast)' }}
      >
        {trigger ?? <Trash2 size={14} aria-hidden />}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-border bg-surface py-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ boxShadow: 'var(--shadow-raised)' }}
        >
          {items.map((it) => {
            const Icon = it.icon;
            const danger = it.tone === 'danger';
            return (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); it.onSelect(); }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${danger ? 'text-danger hover:bg-danger hover:text-white' : 'text-text hover:bg-elevated'}`}
                style={{ transitionDuration: 'var(--motion-fast)' }}
              >
                {Icon ? <Icon size={14} aria-hidden /> : null}
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
