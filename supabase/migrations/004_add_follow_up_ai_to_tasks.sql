alter table public.tasks
add column if not exists follow_up_enabled boolean not null default false,
add column if not exists follow_up_after_days int not null default 3,
add column if not exists follow_up_suggestion text,
add column if not exists follow_up_last_generated_at timestamptz;

create index if not exists tasks_follow_up_idx on public.tasks (
  user_id,
  status,
  follow_up_enabled,
  created_at
);
