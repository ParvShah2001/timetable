# Database Setup & Schema Guide (Supabase)

This project uses [Supabase](https://supabase.com) (hosted PostgreSQL) for user authentication and real-time event synchronization.

---

## 1. Quick Setup (2 Minutes)

1. Create a free account and new project at [supabase.com](https://supabase.com).
2. Once your project is created, navigate to **Project Settings -> API**.
3. Copy your **Project URL** and **anon / public key**.
4. In your local repository, create a `.env` file (or copy from `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
5. Open the **SQL Editor** in your Supabase dashboard and execute the script below.

---

## 2. SQL Schema & Migration Script

Run this SQL snippet in the Supabase **SQL Editor**:

```sql
-- ============================================================
-- Complete Timetable Setup for Supabase PostgreSQL
-- ============================================================

-- 1. Create table
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

-- 2. Add columns if migrating an existing schema
alter table public.timetable_events add column if not exists week_key text;
alter table public.timetable_events add column if not exists year integer;
alter table public.timetable_events add column if not exists week_number integer;
alter table public.timetable_events add column if not exists description text default '';
alter table public.timetable_events add column if not exists notes text default '';
alter table public.timetable_events add column if not exists location text default '';
alter table public.timetable_events add column if not exists color text default '#3b82f6';
alter table public.timetable_events alter column year drop not null;
alter table public.timetable_events alter column week_number drop not null;

-- 3. Enable Row-Level Security (RLS)
alter table public.timetable_events enable row level security;

-- 4. Set RLS Policies (Users can only read and mutate their own records)
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

-- 5. Grant Schema and Table Permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.timetable_events to authenticated, service_role;
grant select on table public.timetable_events to anon;

-- 6. Enable Realtime Replication
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
```

---

## 3. Row-Level Security (RLS) Verification

Row-Level Security ensures that even though the app runs client-side with the public `anon` key, users are completely isolated and can never view or modify other users' tasks.

| Policy Name | Action | Rule |
| :--- | :--- | :--- |
| `Users can view own events` | `SELECT` | `auth.uid() = user_id` |
| `Users can insert own events` | `INSERT` | `auth.uid() = user_id` |
| `Users can update own events` | `UPDATE` | `auth.uid() = user_id` |
| `Users can delete own events` | `DELETE` | `auth.uid() = user_id` |

---

## 4. Supabase Realtime Channels

The client subscribes to PostgreSQL changes using the `@supabase/supabase-js` channel API:

```ts
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
      // Trigger instant UI refresh
      onRemoteChange();
    }
  )
  .subscribe();
```

When a user updates a task on their phone, their laptop or tablet receives the database delta over WebSockets and updates the schedule instantaneously without a page reload.
