'use client';
import { useState } from 'react';
import type { EngageInput } from '../../lib/types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
export function EngageForm({ onEngage, defaultAutonomy, defaultMaxSessions }: { onEngage: (v: EngageInput) => void; defaultAutonomy?: string; defaultMaxSessions?: number }) {
  const [epicId, setEpicId] = useState('');
  const [autonomy, setAutonomy] = useState(defaultAutonomy ?? 'L3');
  const [maxSessions, setMaxSessions] = useState(defaultMaxSessions ?? 1);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => { e.preventDefault(); if (epicId.trim()) onEngage({ epicId: epicId.trim(), autonomy, maxSessions, clearedGuardrails: [] }); }}
    >
      <Input value={epicId} onChange={(e) => setEpicId(e.target.value)} placeholder="Epic ID" className="w-44" />
      <Select value={autonomy} onChange={(e) => setAutonomy(e.target.value)} className="w-24">
        {['L0', 'L1', 'L2', 'L3'].map((l) => <option key={l} value={l}>{l}</option>)}
      </Select>
      <Input type="number" min={1} value={maxSessions} onChange={(e) => setMaxSessions(Number(e.target.value))} className="w-20" />
      <Button type="submit" variant="accent">Engage</Button>
    </form>
  );
}
