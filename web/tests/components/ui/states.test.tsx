import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState, LoadingState, ErrorState } from '../../../components/ui/states';

describe('states', () => {
  it('EmptyState shows title', () => { render(<EmptyState title="Nothing here" />); expect(screen.getByText('Nothing here')).toBeInTheDocument(); });
  it('LoadingState shows a label', () => { render(<LoadingState label="Loading" />); expect(screen.getByText('Loading')).toBeInTheDocument(); });
  it('ErrorState shows message and retry fires', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="boom" onRetry={onRetry} />);
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
