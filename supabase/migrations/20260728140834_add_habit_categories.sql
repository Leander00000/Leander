begin;

alter table public.habits
  add column category text not null default 'General';

alter table public.habits
  add constraint habits_category_check
  check (
    category = btrim(category)
    and category in (
      'General',
      'Health',
      'Movement',
      'Mind',
      'Focus',
      'Home'
    )
  );

revoke all privileges
on table public.habits, public.habit_checkins
from authenticated;

grant select, insert, update, delete
on table public.habits, public.habit_checkins
to authenticated;

commit;
