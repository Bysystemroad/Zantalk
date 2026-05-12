create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  task_date date not null,
  task_time time not null,
  person text,
  category text not null check (category in ('work', 'personal', 'study', 'health', 'other')),
  reminder_minutes_before int not null default 30,
  original_transcript text,
  status text not null default 'pending' check (status in ('pending', 'done')),
  follow_up_enabled boolean not null default false,
  follow_up_after_days int not null default 1,
  follow_up_suggestion text,
  follow_up_last_generated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists "Users can read own tasks" on public.tasks;
create policy "Users can read own tasks"
on public.tasks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks"
on public.tasks for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
on public.tasks for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
on public.tasks for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists tasks_user_date_idx on public.tasks (user_id, task_date, task_time);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists tasks_follow_up_idx on public.tasks (
  user_id,
  status,
  follow_up_enabled,
  created_at
);
