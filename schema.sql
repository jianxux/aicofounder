create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users (id) on delete set null,
  session_id text not null,
  event text not null,
  data jsonb not null default '{}'::jsonb,
  ip text null,
  created_at timestamptz not null default now()
);

create index if not exists events_created_at_desc_idx on public.events (created_at desc);
create index if not exists events_event_idx on public.events (event);
create index if not exists events_session_id_idx on public.events (session_id);

alter table public.events enable row level security;

grant insert, select on public.events to anon, authenticated;

drop policy if exists "Anyone can insert analytics events" on public.events;
create policy "Anyone can insert analytics events"
on public.events
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated users can read their own analytics events" on public.events;
create policy "Authenticated users can read their own analytics events"
on public.events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Anyone can read analytics events" on public.events;
create policy "Anyone can read analytics events"
on public.events
for select
to anon, authenticated
using (true);
