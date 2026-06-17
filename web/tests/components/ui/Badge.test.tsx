import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../../components/ui/Badge';
import { Table, THead, TR, TH, TD } from '../../../components/ui/Table';

describe('Badge + Table', () => {
  it('Badge renders mono label', () => {
    render(<Badge>working</Badge>);
    expect(screen.getByText('working')).toHaveClass('font-mono');
  });
  it('Table renders header + a mono cell', () => {
    render(<Table><THead><TR><TH>ID</TH></TR></THead><tbody><TR><TD mono>orca-1</TD></TR></tbody></Table>);
    expect(screen.getByText('ID')).toHaveClass('uppercase');
    expect(screen.getByText('orca-1')).toHaveClass('font-mono');
  });
});
