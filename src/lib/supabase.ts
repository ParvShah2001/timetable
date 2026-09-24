import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';
import type { TimetableEvent, WeekKey, DayOfWeek, Category } from '../types';

const STORAGE_URL_KEY = 'timetable_supabase_url';
const STORAGE_ANON_KEY = 'timetable_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getStoredConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const storedKey = localStorage.getItem(STORAGE_ANON_KEY) || '';

  return {
    url: envUrl || storedUrl,
    anonKey: envKey || storedKey,
  };
}

export function saveStoredConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  clientInstance = null; // Re-create client
}

export function clearStoredConfig(): void {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
  clientInstance = null;
}

export function isConfigured(): boolean {
  const config = getStoredConfig();
  return Boolean(config.url && config.anonKey);
}

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getStoredConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return clientInstance;
}

/* ── Supabase Database Operations ── */

export interface DbTimetableEvent {
  id: string;
  user_id: string;
  week_key: string;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  description: string;
  location: string;
  category: string;
  color: string;
}

export function dbToAppEvent(row: DbTimetableEvent): TimetableEvent {
  return {
    id: row.id,
    title: row.title,
    day: row.day as DayOfWeek,
    startTime: row.start_time,
    endTime: row.end_time,
    description: row.description || '',
    location: row.location || '',
    category: (row.category as Category) || 'Work',
    color: row.color || '#3b82f6',
  };
}

export function appToDbEvent(event: TimetableEvent, userId: string, weekKey: string): DbTimetableEvent {
  return {
    id: event.id,
    user_id: userId,
    week_key: weekKey,
    title: event.title,
    day: event.day,
    start_time: event.startTime,
    end_time: event.endTime,
    description: event.description,
    location: event.location,
    category: event.category,
    color: event.color,
  };
}

/** Fetch all timetable events for the authenticated user */
export async function fetchUserEvents(userId: string): Promise<Record<WeekKey, TimetableEvent[]>> {
  const supabase = getSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('timetable_events')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching timetable events:', error);
    return {};
  }

  const grouped: Record<WeekKey, TimetableEvent[]> = {};

  (data as DbTimetableEvent[]).forEach((row) => {
    const wk = row.week_key;
    if (!grouped[wk]) grouped[wk] = [];
    grouped[wk].push(dbToAppEvent(row));
  });

  return grouped;
}

/** Insert or update an event in Supabase */
export async function upsertEvent(event: TimetableEvent, userId: string, weekKey: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const dbRow = appToDbEvent(event, userId, weekKey);

  const { error } = await supabase
    .from('timetable_events')
    .upsert(dbRow, { onConflict: 'id' });

  if (error) {
    console.error('Error saving event to Supabase:', error);
    return false;
  }
  return true;
}

/** Delete an event from Supabase */
export async function deleteEvent(eventId: string, userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('timetable_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting event from Supabase:', error);
    return false;
  }
  return true;
}

/** Clear all events for a week from Supabase */
export async function clearWeekEvents(weekKey: string, userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('timetable_events')
    .delete()
    .eq('week_key', weekKey)
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing week in Supabase:', error);
    return false;
  }
  return true;
}

/** SQL Setup script to create the table and RLS in Supabase */
export const SUPABASE_SQL_SETUP = `-- Run this in your Supabase SQL Editor (supabase.com -> SQL Editor):

create table if not exists public.timetable_events (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_key text not null,
  title text not null,
  day text not null,
  start_time text not null,
  end_time text not null,
  description text default '',
  location text default '',
  category text default 'Work',
  color text default '#3b82f6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (ensures each user only accesses their own timetable)
alter table public.timetable_events enable row level security;

-- Policies for isolated per-user access:
create policy "Users can view own events" on public.timetable_events
  for select using (auth.uid() = user_id);

create policy "Users can insert own events" on public.timetable_events
  for insert with check (auth.uid() = user_id);

create policy "Users can update own events" on public.timetable_events
  for update using (auth.uid() = user_id);

create policy "Users can delete own events" on public.timetable_events
  for delete using (auth.uid() = user_id);
`;
