import { LayoutDashboard, ListChecks, SquareTerminal, Rocket, Settings, type LucideIcon } from 'lucide-react';

export interface NavEntry { href: string; label: string; icon: LucideIcon }
export interface NavGroupData { label: string; items: NavEntry[] }

export const NAV_GROUPS: NavGroupData[] = [
  { label: 'Operate', items: [
    { href: '/dash', label: 'Dash', icon: LayoutDashboard },
    { href: '/tasks', label: 'Tasks', icon: ListChecks },
    { href: '/sessions', label: 'Sessions', icon: SquareTerminal },
    { href: '/missions', label: 'Missions', icon: Rocket },
  ] },
  { label: 'Config', items: [
    { href: '/settings', label: 'Settings', icon: Settings },
  ] },
];
