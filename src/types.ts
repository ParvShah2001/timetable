/* ── Core types for the Timetable application ── */

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export const DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const WEEKDAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export type GridInterval = 15 | 30 | 60;

export type ViewMode = 'week' | '3day' | 'day';

export type TimeRangePreset = 'full' | 'work' | 'active';

export type Category =
  | 'Work'
  | 'Study'
  | 'Personal'
  | 'Exercise'
  | 'Meeting'
  | 'Other';

export const DEFAULT_CATEGORIES: Category[] = [
  'Work',
  'Study',
  'Personal',
  'Exercise',
  'Meeting',
  'Other',
];

export const EVENT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // rose
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b', // slate
] as const;

export interface TimetableEvent {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string; // "HH:MM" 24-hour internal representation
  endTime: string;   // "HH:MM" 24-hour internal representation
  description: string;
  location: string;
  category: Category;
  color: string;
}

/** ISO week identifier: "2026-W39" */
export type WeekKey = string;

export interface Settings {
  gridInterval: GridInterval;
  showWeekends: boolean;
  allowOverlap: boolean;
  timeRangePreset: TimeRangePreset;
  startHour: number; // e.g. 6 or 7 or 8
  endHour: number;   // e.g. 20, 22, 23
}

export interface AppState {
  events: Record<WeekKey, TimetableEvent[]>;
  currentWeek: { year: number; weekNumber: number };
  selectedDay: DayOfWeek;
  viewMode: ViewMode;
  settings: Settings;
  undoStack: Array<Record<WeekKey, TimetableEvent[]>>;
  toastMessage: string | null;
}
