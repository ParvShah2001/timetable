import type { TimetableEvent, WeekKey, DayOfWeek } from './types';

/* ── Time helpers ── */

/** Convert "HH:MM" to total minutes since midnight */
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/** Convert total minutes to "HH:MM" (24h internal format) */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Snap a minute value to the nearest grid interval */
export function snapToGrid(minutes: number, interval: number): number {
  return Math.round(minutes / interval) * interval;
}

/** Format time for display in 12-hour format: "10:00" → "10:00 AM" */
export function formatTime(time: string): string {
  if (!time) return '';
  const mins = timeToMinutes(time);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Format time range: "09:00", "10:30" → "9:00 AM – 10:30 AM" */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/** Format duration: 90 → "1h 30m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/* ── Week helpers ── */

/** Get ISO week number for a date */
export function getISOWeek(date: Date): { year: number; weekNumber: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), weekNumber };
}

/** Build a WeekKey string like "2026-W39" */
export function weekKey(year: number, weekNumber: number): WeekKey {
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

/** Get the Monday date for a given ISO week */
export function getWeekMonday(year: number, weekNumber: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
  return monday;
}

/** Get Mon-Sun dates for a week */
export function getWeekDates(year: number, weekNumber: number): Date[] {
  const monday = getWeekMonday(year, weekNumber);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
}

/** Format a week range for display: "Sep 21 – Sep 27, 2026" */
export function formatWeekLabel(year: number, weekNumber: number): string {
  const dates = getWeekDates(year, weekNumber);
  const mon = dates[0];
  const sun = dates[6];
  const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
  const start = `${monthFmt.format(mon)} ${mon.getUTCDate()}`;
  const end = `${monthFmt.format(sun)} ${sun.getUTCDate()}, ${sun.getUTCFullYear()}`;
  return `${start} – ${end}`;
}

/** Navigate to the next or previous week */
export function offsetWeek(
  year: number,
  weekNumber: number,
  delta: number
): { year: number; weekNumber: number } {
  const monday = getWeekMonday(year, weekNumber);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return getISOWeek(monday);
}

/* ── Event helpers & Overlap layout ── */

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Universal RFC4122 v4 UUID generator fallback for non-secure contexts (HTTP over LAN)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Check if two events overlap on the same day */
export function detectOverlap(a: TimetableEvent, b: TimetableEvent): boolean {
  if (a.day !== b.day) return false;
  if (a.id === b.id) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/** Check if a moved/resized event would overlap any existing events */
export function wouldOverlap(
  event: TimetableEvent,
  allEvents: TimetableEvent[]
): boolean {
  return allEvents.some((e) => detectOverlap(event, e));
}

/**
 * Compute Google Calendar / Apple Calendar style side-by-side layout
 * for events on the same day so overlapping events share the column width cleanly.
 */
export function computeDayEventLayouts(
  events: TimetableEvent[]
): Record<string, { colIndex: number; totalCols: number }> {
  if (events.length === 0) return {};

  // Sort events by start time, then by duration descending
  const sorted = [...events].sort((a, b) => {
    const startA = timeToMinutes(a.startTime);
    const startB = timeToMinutes(b.startTime);
    if (startA !== startB) return startA - startB;
    const durA = timeToMinutes(a.endTime) - startA;
    const durB = timeToMinutes(b.endTime) - startB;
    return durB - durA;
  });

  // Group connected/overlapping clusters
  const clusters: TimetableEvent[][] = [];
  let currentCluster: TimetableEvent[] = [];
  let clusterEnd = -1;

  for (const event of sorted) {
    const start = timeToMinutes(event.startTime);
    const end = timeToMinutes(event.endTime);

    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [event];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const layouts: Record<string, { colIndex: number; totalCols: number }> = {};

  for (const cluster of clusters) {
    // Greedy column allocation within this cluster
    const columns: TimetableEvent[][] = [];

    for (const event of cluster) {
      const eventStart = timeToMinutes(event.startTime);
      let placed = false;

      for (let c = 0; c < columns.length; c++) {
        const lastInCol = columns[c][columns[c].length - 1];
        if (timeToMinutes(lastInCol.endTime) <= eventStart) {
          columns[c].push(event);
          layouts[event.id] = { colIndex: c, totalCols: 1 }; // totalCols updated below
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
        layouts[event.id] = { colIndex: columns.length - 1, totalCols: 1 };
      }
    }

    const totalCols = columns.length;
    for (const event of cluster) {
      if (layouts[event.id]) {
        layouts[event.id].totalCols = totalCols;
      }
    }
  }

  return layouts;
}

/* ── Day index helpers ── */

export const DAY_ORDER: DayOfWeek[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

export function dayIndex(day: DayOfWeek): number {
  return DAY_ORDER.indexOf(day);
}

export function dayFromIndex(index: number): DayOfWeek {
  return DAY_ORDER[((index % 7) + 7) % 7];
}

/* ── Import / Export ── */

export function exportToJSON(events: Record<WeekKey, TimetableEvent[]>): string {
  return JSON.stringify(events, null, 2);
}

export function importFromJSON(json: string): Record<WeekKey, TimetableEvent[]> | null {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<WeekKey, TimetableEvent[]>;
    }
    return null;
  } catch {
    return null;
  }
}

/* ── Default Grid constants ── */

export const DEFAULT_START_HOUR = 7;  // 7:00 AM
export const DEFAULT_END_HOUR = 23;   // 11:00 PM (fits full active day including evening tasks)
