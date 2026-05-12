create table if not exists public.google_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.google_connections enable row level security;

drop policy if exists "Users can read own google connection" on public.google_connections;
create policy "Users can read own google connection"
on public.google_connections for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own google connection" on public.google_connections;
create policy "Users can insert own google connection"
on public.google_connections for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own google connection" on public.google_connections;
create policy "Users can update own google connection"
on public.google_connections for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own google connection" on public.google_connections;
create policy "Users can delete own google connection"
on public.google_connections for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_google_connections_updated_at on public.google_connections;
create trigger set_google_connections_updated_at
before update on public.google_connections
for each row
execute function public.set_updated_at();

alter table public.tasks
add column if not exists google_calendar_event_id text,
add column if not exists google_calendar_synced_at timestamptz;
