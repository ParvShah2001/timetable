import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TimetableEvent, WeekKey, DayOfWeek, Category } from '../types';
import { SUPABASE_CONFIG } from '../config';

const STORAGE_URL_KEY = 'timetable_supabase_url';
const STORAGE_ANON_KEY = 'timetable_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getStoredConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_CONFIG.url || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_CONFIG.anonKey || '';

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

/* ── Mappings between App Event & DB Row ── */

export function dbToAppEvent(row: any): TimetableEvent {
  return {
    id: String(row.id),
    title: row.title || 'Untitled',
    day: (row.day as DayOfWeek) || 'Monday',
    startTime: row.start_time || '09:00',
    endTime: row.end_time || '10:00',
    description: row.description || row.notes || '',
    location: row.location || '',
    category: (row.category as Category) || 'Work',
    color: row.color || '#3b82f6',
  };
}

export interface FetchResult {
  events: Record<WeekKey, TimetableEvent[]>;
  error: string | null;
}

/** Fetch all timetable events for the authenticated user from Supabase */
export async function fetchUserEvents(userId: string): Promise<FetchResult> {
  const supabase = getSupabase();
  if (!supabase) return { events: {}, error: 'Supabase client not initialized' };

  try {
    const { data, error } = await supabase
      .from('timetable_events')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching timetable events from Supabase:', error);
      return { events: {}, error: error.message };
    }

    const grouped: Record<WeekKey, TimetableEvent[]> = {};

    ((data || []) as any[]).forEach((row) => {
      let wk = row.week_key;
      if (!wk && row.year && row.week_number) {
        wk = `${row.year}-W${String(row.week_number).padStart(2, '0')}`;
      }
      if (!wk) wk = 'default';
      if (!grouped[wk]) grouped[wk] = [];
      grouped[wk].push(dbToAppEvent(row));
    });

    return { events: grouped, error: null };
  } catch (err: any) {
    console.error('Exception fetching timetable events:', err);
    return { events: {}, error: err?.message || 'Network error fetching events' };
  }
}

/** Insert or update an event in Supabase */
export async function upsertEvent(
  event: TimetableEvent,
  userId: string,
  weekKey: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Database not connected. Please connect Supabase.' };

  const parts = weekKey.split('-W');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const week_number = parseInt(parts[1], 10) || 1;

  // Primary standard payload
  const primaryRow: Record<string, any> = {
    id: event.id,
    user_id: userId,
    week_key: weekKey,
    title: event.title,
    day: event.day,
    start_time: event.startTime,
    end_time: event.endTime,
    description: event.description || '',
    location: event.location || '',
    category: event.category || 'Work',
    color: event.color || '#3b82f6',
  };

  try {
    let { error } = await supabase
      .from('timetable_events')
      .upsert(primaryRow, { onConflict: 'id' });

    // Fallback if the user's table was created with alternative column names (notes, year, week_number)
    if (error && error.message && error.message.includes('column')) {
      console.warn('Upsert failed with primary payload, retrying with fallback payload:', error.message);
      const fallbackRow: Record<string, any> = {
        id: event.id,
        user_id: userId,
        title: event.title,
        day: event.day,
        start_time: event.startTime,
        end_time: event.endTime,
        category: event.category || 'Work',
        notes: event.description || '',
        year,
        week_number,
      };
      const retry = await supabase.from('timetable_events').upsert(fallbackRow, { onConflict: 'id' });
      if (!retry.error) {
        return { success: true, error: null };
      }
      error = retry.error;
    }

    if (error) {
      console.error('Supabase upsert error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Exception upserting event:', err);
    return { success: false, error: err?.message || 'Network error saving event' };
  }
}

/** Delete an event from Supabase */
export async function deleteEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Database not connected' };

  try {
    const { error } = await supabase
      .from('timetable_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting event from Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Exception deleting event:', err);
    return { success: false, error: err?.message || 'Network error deleting event' };
  }
}

/** Clear all events for a week from Supabase */
export async function clearWeekEvents(
  weekKey: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Database not connected' };

  try {
    let { error } = await supabase
      .from('timetable_events')
      .delete()
      .eq('week_key', weekKey)
      .eq('user_id', userId);

    // Fallback if table uses year & week_number
    if (error && error.message && error.message.includes('column')) {
      const parts = weekKey.split('-W');
      const year = parseInt(parts[0], 10);
      const week_number = parseInt(parts[1], 10);
      if (year && week_number) {
        const retry = await supabase
          .from('timetable_events')
          .delete()
          .eq('year', year)
          .eq('week_number', week_number)
          .eq('user_id', userId);
        error = retry.error;
      }
    }

    if (error) {
      console.error('Error clearing week in Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Exception clearing week:', err);
    return { success: false, error: err?.message || 'Network error clearing week' };
  }
}

/** Real-time subscription to listen for cloud changes made by any device */
export function subscribeToUserEvents(
  userId: string,
  onRemoteChange: () => void
): (() => void) | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const channel = supabase
      .channel(`realtime:timetable:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timetable_events',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onRemoteChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription not available or failed:', err);
    return null;
  }
}

/** SQL Setup script to create or update the table and enable Realtime in Supabase */
export const SUPABASE_SQL_SETUP = `-- ============================================================
-- Complete, Fail-Safe Timetable Setup for Supabase
-- Run this in your Supabase SQL Editor (supabase.com -> SQL Editor)
-- ============================================================

-- 1. Create table if not exists
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
  year integer,
  week_number integer,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Safely add any missing columns if the table already existed
alter table public.timetable_events add column if not exists week_key text;
alter table public.timetable_events add column if not exists year integer;
alter table public.timetable_events add column if not exists week_number integer;
alter table public.timetable_events add column if not exists description text default '';
alter table public.timetable_events add column if not exists notes text default '';
alter table public.timetable_events add column if not exists location text default '';
alter table public.timetable_events add column if not exists color text default '#3b82f6';
alter table public.timetable_events alter column year drop not null;
alter table public.timetable_events alter column week_number drop not null;

-- 3. Enable Row Level Security (RLS)
alter table public.timetable_events enable row level security;

-- 4. Policies (allows authenticated users full control over their own events)
drop policy if exists "Users can view own events" on public.timetable_events;
create policy "Users can view own events" on public.timetable_events
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own events" on public.timetable_events;
create policy "Users can insert own events" on public.timetable_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own events" on public.timetable_events;
create policy "Users can update own events" on public.timetable_events
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own events" on public.timetable_events;
create policy "Users can delete own events" on public.timetable_events
  for delete using (auth.uid() = user_id);

-- 5. Grant table permissions to authenticated role (Fixes "permission denied for table timetable_events")
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.timetable_events to authenticated, service_role;
grant select on table public.timetable_events to anon;

-- 6. Enable Supabase Realtime (so changes appear instantly across mobile, tablet, and PC!)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'timetable_events'
  ) then
    alter publication supabase_realtime add table public.timetable_events;
  end if;
end;
$$;
`;
