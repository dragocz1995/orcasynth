import { Button } from './Button';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      <p className="uppercase tracking-wide text-sm text-text">{title}</p>
      {description && <p className="text-xs text-text-muted">{description}</p>}
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return <div className="flex items-center justify-center py-12 font-mono text-xs text-text-muted animate-pulse">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-sm text-accent">{message}</p>
      {onRetry && <Button onClick={onRetry}>Retry</Button>}
    </div>
  );
}
