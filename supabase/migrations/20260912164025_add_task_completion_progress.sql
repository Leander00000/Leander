begin;

-- The server reserves one command per Todoist occurrence before calling Todoist.
-- Retrying that command reuses its UUID; completed rows are the source of task XP.
create table public.task_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null check (task_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  occurrence bigint not null check (occurrence >= 0),
  command_id uuid not null unique,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, task_id, occurrence)
);

alter table public.task_completions enable row level security;
revoke all on public.task_completions from public, anon, authenticated;
grant select on public.task_completions to authenticated;
grant select, insert, update, delete on public.task_completions to service_role;
create policy task_completions_select_own on public.task_completions
  for select to authenticated using (user_id = (select auth.uid()));

-- Habits and habit_checkins stay untouched: existing history counts immediately,
-- and deleting or undoing a check-in automatically removes the associated XP.
commit;
