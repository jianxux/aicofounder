create type public.agent_session_origin as enum ('chat', 'brainstorm', 'research', 'ultraplan');
create type public.memory_scope as enum ('user', 'project', 'session', 'run');
create type public.memory_kind as enum (
  'fact',
  'decision',
  'constraint',
  'research_finding',
  'customer_quote',
  'task_state',
  'summary'
);
create type public.memory_status as enum ('active', 'superseded', 'archived');
create type public.memory_confirmation as enum ('user_confirmed', 'assistant_inferred', 'system_imported');
create type public.summary_level as enum ('session', 'phase', 'project');

create table public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  origin public.agent_session_origin not null default 'chat',
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table public.memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete cascade,
  session_id uuid null references public.agent_sessions(id) on delete set null,
  scope public.memory_scope not null default 'project',
  kind public.memory_kind not null,
  title text not null default '',
  content text not null,
  source text not null default 'chat',
  source_message_id uuid null references public.messages(id) on delete set null,
  source_refs jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  importance smallint not null default 3 check (importance between 1 and 5),
  confidence numeric(4,3) not null default 0.750 check (confidence >= 0 and confidence <= 1),
  confirmation_status public.memory_confirmation not null default 'assistant_inferred',
  status public.memory_status not null default 'active',
  supersedes_memory_id uuid null references public.memory_entries(id) on delete set null,
  dedupe_key text null,
  searchable tsvector generated always as (
    to_tsvector(
      'simple',
      trim(
        both ' '
        from concat_ws(' ', coalesce(title, ''), coalesce(content, ''), array_to_string(tags, ' '))
      )
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scope <> 'user' or project_id is null),
  check (scope in ('user', 'project', 'session', 'run')),
  check (session_id is null or project_id is not null)
);

create table public.memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid null references public.agent_sessions(id) on delete set null,
  summary_level public.summary_level not null,
  summary_version integer not null default 1 check (summary_version >= 1),
  content text not null,
  source_message_start_id uuid null references public.messages(id) on delete set null,
  source_message_end_id uuid null references public.messages(id) on delete set null,
  token_estimate integer not null default 0 check (token_estimate >= 0),
  freshness_score numeric(4,3) not null default 1.000 check (freshness_score >= 0 and freshness_score <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index messages_id_project_id_idx on public.messages (id, project_id);
create unique index agent_sessions_id_project_id_idx on public.agent_sessions (id, project_id);
create unique index memory_entries_id_project_id_idx on public.memory_entries (id, project_id);
create index agent_sessions_project_started_idx on public.agent_sessions (project_id, started_at desc, id desc);
create index agent_sessions_user_started_idx on public.agent_sessions (user_id, started_at desc, id desc);

create index memory_entries_project_idx on public.memory_entries (project_id, status, updated_at desc, id desc);
create index memory_entries_session_idx on public.memory_entries (session_id, status, created_at desc, id desc);
create index memory_entries_kind_scope_idx on public.memory_entries (kind, scope, status);
create unique index memory_entries_active_dedupe_idx
on public.memory_entries (project_id, dedupe_key)
where dedupe_key is not null and project_id is not null and status = 'active';
create index memory_entries_search_idx on public.memory_entries using gin (searchable);
create index memory_entries_tags_idx on public.memory_entries using gin (tags);

create index memory_summaries_project_idx on public.memory_summaries (project_id, summary_level, created_at desc, id desc);
create index memory_summaries_session_idx on public.memory_summaries (session_id, created_at desc, id desc);

create or replace function public.validate_agent_memory_project_integrity()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'memory_entries' then
    if new.session_id is not null and not exists (
      select 1
      from public.agent_sessions
      where public.agent_sessions.id = new.session_id
        and public.agent_sessions.project_id = new.project_id
    ) then
      raise exception 'memory_entries.session_id must belong to project_id';
    end if;

    if new.source_message_id is not null and not exists (
      select 1
      from public.messages
      where public.messages.id = new.source_message_id
        and public.messages.project_id = new.project_id
    ) then
      raise exception 'memory_entries.source_message_id must belong to project_id';
    end if;

    if new.supersedes_memory_id is not null and not exists (
      select 1
      from public.memory_entries
      where public.memory_entries.id = new.supersedes_memory_id
        and public.memory_entries.project_id = new.project_id
    ) then
      raise exception 'memory_entries.supersedes_memory_id must belong to project_id';
    end if;
  elsif tg_table_name = 'memory_summaries' then
    if new.session_id is not null and not exists (
      select 1
      from public.agent_sessions
      where public.agent_sessions.id = new.session_id
        and public.agent_sessions.project_id = new.project_id
    ) then
      raise exception 'memory_summaries.session_id must belong to project_id';
    end if;

    if new.source_message_start_id is not null and not exists (
      select 1
      from public.messages
      where public.messages.id = new.source_message_start_id
        and public.messages.project_id = new.project_id
    ) then
      raise exception 'memory_summaries.source_message_start_id must belong to project_id';
    end if;

    if new.source_message_end_id is not null and not exists (
      select 1
      from public.messages
      where public.messages.id = new.source_message_end_id
        and public.messages.project_id = new.project_id
    ) then
      raise exception 'memory_summaries.source_message_end_id must belong to project_id';
    end if;
  end if;

  return new;
end;
$$;

create trigger set_agent_sessions_updated_at
before update on public.agent_sessions
for each row
execute function public.set_updated_at();

create trigger set_memory_entries_updated_at
before update on public.memory_entries
for each row
execute function public.set_updated_at();

create trigger validate_memory_entries_project_integrity
before insert or update on public.memory_entries
for each row
execute function public.validate_agent_memory_project_integrity();

create trigger set_memory_summaries_updated_at
before update on public.memory_summaries
for each row
execute function public.set_updated_at();

create trigger validate_memory_summaries_project_integrity
before insert or update on public.memory_summaries
for each row
execute function public.validate_agent_memory_project_integrity();

alter table public.agent_sessions enable row level security;
alter table public.memory_entries enable row level security;
alter table public.memory_summaries enable row level security;

create policy "agent_sessions_select_own"
on public.agent_sessions
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = agent_sessions.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "agent_sessions_insert_own"
on public.agent_sessions
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = agent_sessions.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "agent_sessions_update_own"
on public.agent_sessions
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = agent_sessions.project_id
      and public.projects.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = agent_sessions.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "agent_sessions_delete_own"
on public.agent_sessions
for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = agent_sessions.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "memory_entries_select_own"
on public.memory_entries
for select
using (
  auth.uid() = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where public.projects.id = memory_entries.project_id
        and public.projects.user_id = auth.uid()
    )
  )
);

create policy "memory_entries_insert_own"
on public.memory_entries
for insert
with check (
  auth.uid() = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where public.projects.id = memory_entries.project_id
        and public.projects.user_id = auth.uid()
    )
  )
);

create policy "memory_entries_update_own"
on public.memory_entries
for update
using (
  auth.uid() = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where public.projects.id = memory_entries.project_id
        and public.projects.user_id = auth.uid()
    )
  )
)
with check (
  auth.uid() = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where public.projects.id = memory_entries.project_id
        and public.projects.user_id = auth.uid()
    )
  )
);

create policy "memory_entries_delete_own"
on public.memory_entries
for delete
using (
  auth.uid() = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where public.projects.id = memory_entries.project_id
        and public.projects.user_id = auth.uid()
    )
  )
);

create policy "memory_summaries_select_own"
on public.memory_summaries
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = memory_summaries.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "memory_summaries_insert_own"
on public.memory_summaries
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = memory_summaries.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "memory_summaries_update_own"
on public.memory_summaries
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = memory_summaries.project_id
      and public.projects.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = memory_summaries.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "memory_summaries_delete_own"
on public.memory_summaries
for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.projects
    where public.projects.id = memory_summaries.project_id
      and public.projects.user_id = auth.uid()
  )
);
