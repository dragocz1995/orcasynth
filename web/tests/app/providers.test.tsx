import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Providers } from '../../app/providers';

class FakeES { onmessage = null; close() {} constructor(public url: string) {} }
beforeEach(() => { (globalThis as any).EventSource = FakeES as any; });

describe('Providers', () => {
  it('renders children inside the query provider', () => {
    render(<Providers><span>child</span></Providers>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
