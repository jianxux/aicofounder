create extension if not exists pgcrypto;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled Project',
  description text not null default '',
  phase text not null default 'Getting started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender text not null check (sender in ('user', 'assistant')),
  content text not null default '',
  created_at timestamptz not null default now()
);

create table public.canvas_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('note', 'section', 'document', 'website_builder')),
  data jsonb not null default '{}',
  x double precision not null default 0,
  y double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.phases (
  id text not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  primary key (id, project_id)
);

create table public.phase_tasks (
  id uuid primary key default gen_random_uuid(),
  phase_id text not null,
  project_id uuid not null,
  label text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  foreign key (phase_id, project_id) references public.phases(id, project_id) on delete cascade
);

create index messages_project_id_idx on public.messages (project_id);
create index canvas_items_project_id_idx on public.canvas_items (project_id);
create index phases_project_id_idx on public.phases (project_id);
create index phase_tasks_project_id_idx on public.phase_tasks (project_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create trigger set_canvas_items_updated_at
before update on public.canvas_items
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.canvas_items enable row level security;
alter table public.phases enable row level security;
alter table public.phase_tasks enable row level security;

create policy "projects_select_own"
on public.projects
for select
using (auth.uid() = user_id);

create policy "projects_insert_own"
on public.projects
for insert
with check (auth.uid() = user_id);

create policy "projects_update_own"
on public.projects
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "projects_delete_own"
on public.projects
for delete
using (auth.uid() = user_id);

create policy "messages_select_own_project"
on public.messages
for select
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = messages.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "messages_insert_own_project"
on public.messages
for insert
with check (
  exists (
    select 1
    from public.projects
    where public.projects.id = messages.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "messages_update_own_project"
on public.messages
for update
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = messages.project_id
      and public.projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where public.projects.id = messages.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "messages_delete_own_project"
on public.messages
for delete
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = messages.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "canvas_items_select_own_project"
on public.canvas_items
for select
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = canvas_items.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "canvas_items_insert_own_project"
on public.canvas_items
for insert
with check (
  exists (
    select 1
    from public.projects
    where public.projects.id = canvas_items.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "canvas_items_update_own_project"
on public.canvas_items
for update
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = canvas_items.project_id
      and public.projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where public.projects.id = canvas_items.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "canvas_items_delete_own_project"
on public.canvas_items
for delete
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = canvas_items.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "phases_select_own_project"
on public.phases
for select
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = phases.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "phases_insert_own_project"
on public.phases
for insert
with check (
  exists (
    select 1
    from public.projects
    where public.projects.id = phases.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "phases_update_own_project"
on public.phases
for update
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = phases.project_id
      and public.projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where public.projects.id = phases.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "phases_delete_own_project"
on public.phases
for delete
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = phases.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "phase_tasks_select_own_project"
on public.phase_tasks
for select
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = phase_tasks.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "phase_tasks_insert_own_project"
on public.phase_tasks
for insert
with check (
  exists (
    select 1
    from public.projects
    where public.projects.id = phase_tasks.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "phase_tasks_update_own_project"
on public.phase_tasks
for update
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = phase_tasks.project_id
      and public.projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where public.projects.id = phase_tasks.project_id
      and public.projects.user_id = auth.uid()
  )
);

create policy "phase_tasks_delete_own_project"
on public.phase_tasks
for delete
using (
  exists (
    select 1
    from public.projects
    where public.projects.id = phase_tasks.project_id
      and public.projects.user_id = auth.uid()
  )
);
