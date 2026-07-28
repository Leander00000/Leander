create index habit_checkins_owner_habit_idx
  on public.habit_checkins (user_id, habit_id);
