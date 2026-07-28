-- Applied to the Leander Supabase project.
begin;

create table public.google_calendar_connections (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  token_ciphertext text not null,
  scopes text[] not null
    default array[
      'https://www.googleapis.com/auth/calendar.readonly'
    ]::text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint google_calendar_token_ciphertext_length_check
    check (char_length(token_ciphertext) between 80 and 12000),
  constraint google_calendar_scopes_check
    check (
      cardinality(scopes) between 1 and 8
      and array_position(scopes, null) is null
      and scopes <@
        array[
          'https://www.googleapis.com/auth/calendar.readonly'
        ]::text[]
    )
);

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_connections force row level security;

create policy google_calendar_connections_select_own
  on public.google_calendar_connections for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy google_calendar_connections_insert_own
  on public.google_calendar_connections for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy google_calendar_connections_update_own
  on public.google_calendar_connections for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy google_calendar_connections_delete_own
  on public.google_calendar_connections for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges
on table public.google_calendar_connections
from public, anon, authenticated;

grant select, insert, update, delete
on table public.google_calendar_connections
to authenticated;

commit;
