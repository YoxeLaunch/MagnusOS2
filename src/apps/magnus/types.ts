import { LucideIcon } from 'lucide-react';

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  WAR_ROOM = 'WAR_ROOM',
  LABORATORY = 'LABORATORY',
  MINDSET = 'MINDSET',
  STYLE_LAB = 'STYLE_LAB'
}

export interface NavItem {
  id: ViewState;
  label: string;
  icon: LucideIcon;
}

export interface StrategyScenario {
  id: string;
  title: string;
  description: string;
  options: {
    type: 'emotional' | 'passive' | 'strategic';
    label: string;
    description: string;
    outcome: {
      immediate: string;
      longTerm: string;
      law: string;
    };
  }[];
}

export interface Quote {
  text: string;
  author: string;
  source?: string;
}

export interface CalendarDay {
  day: number;
  isWeekend: boolean;
  isToday: boolean;
  events?: string[];
}

export interface User {
  username: string;
  name: string;
  password?: string; // Optional for display purposes, but needed for auth logic
  avatar?: string; // Base64 or URL
  role: 'admin' | 'user';
  tags?: string[]; // e.g., 'VIP'
}

export interface ModuleChecklist {
  reading: string;
  habit: string;
  mission: string;
}

export interface CurriculumModule {
  id: string;
  month: string;
  title: string;
  mentor: string;
  description: string;
  checklist: ModuleChecklist;
  locked: boolean;
  status: 'locked' | 'active' | 'completed' | 'pending';
}