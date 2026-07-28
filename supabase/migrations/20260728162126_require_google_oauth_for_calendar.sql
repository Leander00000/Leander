-- Applied to the Leander Supabase project.
begin;

alter policy google_calendar_connections_select_own
  on public.google_calendar_connections
  using (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)
      @> '[{"method":"oauth"}]'::jsonb
  );

alter policy google_calendar_connections_insert_own
  on public.google_calendar_connections
  with check (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)
      @> '[{"method":"oauth"}]'::jsonb
  );

alter policy google_calendar_connections_update_own
  on public.google_calendar_connections
  using (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)
      @> '[{"method":"oauth"}]'::jsonb
  )
  with check (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)
      @> '[{"method":"oauth"}]'::jsonb
  );

alter policy google_calendar_connections_delete_own
  on public.google_calendar_connections
  using (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)
      @> '[{"method":"oauth"}]'::jsonb
  );

commit;
