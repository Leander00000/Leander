begin;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null,
  description text,
  icon text,
  color text,
  days_of_week smallint[] not null
    default array[1, 2, 3, 4, 5, 6, 7]::smallint[],
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),

  constraint habits_user_id_id_key unique (user_id, id),
  constraint habits_name_length_check
    check (char_length(btrim(name)) between 1 and 120),
  constraint habits_description_length_check
    check (description is null or char_length(description) <= 1000),
  constraint habits_icon_length_check
    check (icon is null or char_length(icon) between 1 and 32),
  constraint habits_color_format_check
    check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint habits_days_of_week_check
    check (
      cardinality(days_of_week) between 1 and 7
      and array_position(days_of_week, null) is null
      and days_of_week <@
        array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    ),
  constraint habits_sort_order_check check (sort_order >= 0)
);

create table public.habit_checkins (
  user_id uuid not null default auth.uid(),
  habit_id uuid not null,
  checkin_date date not null,
  note text,
  created_at timestamptz not null default now(),

  constraint habit_checkins_pkey primary key (habit_id, checkin_date),
  constraint habit_checkins_habit_owner_fkey
    foreign key (user_id, habit_id)
    references public.habits (user_id, id)
    on delete cascade,
  constraint habit_checkins_note_length_check
    check (note is null or char_length(note) <= 500)
);

create index habits_owner_active_sort_idx
  on public.habits (user_id, sort_order, created_at)
  where archived_at is null;

create index habit_checkins_owner_date_idx
  on public.habit_checkins (user_id, checkin_date desc);

alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;

create policy habits_select_own
  on public.habits for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy habits_insert_own
  on public.habits for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy habits_update_own
  on public.habits for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy habits_delete_own
  on public.habits for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy habit_checkins_select_own
  on public.habit_checkins for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy habit_checkins_insert_own
  on public.habit_checkins for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy habit_checkins_update_own
  on public.habit_checkins for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy habit_checkins_delete_own
  on public.habit_checkins for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant usage on schema public to authenticated, service_role;

revoke all on table public.habits, public.habit_checkins
from public, anon;

grant select, insert, update, delete
on table public.habits, public.habit_checkins
to authenticated, service_role;

commit;
