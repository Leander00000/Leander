import "server-only";

import { getDemoHabits } from "@/lib/demo-data";
import { getWeekDates } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { HabitView, Viewer } from "@/lib/types";

type HabitRow = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number | null;
};

type CheckinRow = {
  habit_id: string;
  checkin_date: string;
};

export type HabitsResult = {
  habits: HabitView[];
  error: string | null;
};

export async function getHabits(viewer: Viewer): Promise<HabitsResult> {
  if (viewer.isDemo) {
    return { habits: getDemoHabits(), error: null };
  }

  const week = getWeekDates();
  const supabase = await createClient();
  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("id,name,icon,color,sort_order")
    .eq("user_id", viewer.id)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (habitsError) {
    return {
      habits: [],
      error: "Your habits could not be loaded.",
    };
  }

  const habits = (habitRows ?? []) as HabitRow[];
  const habitIds = habits.map((habit) => habit.id);

  if (habitIds.length === 0) {
    return { habits: [], error: null };
  }

  const { data: checkinRows, error: checkinsError } = await supabase
    .from("habit_checkins")
    .select("habit_id,checkin_date")
    .eq("user_id", viewer.id)
    .in("habit_id", habitIds)
    .gte("checkin_date", week[0].key)
    .lte("checkin_date", week[week.length - 1].key);

  if (checkinsError) {
    return {
      habits: [],
      error: "Your recent habit history could not be loaded.",
    };
  }

  const completed = new Set(
    ((checkinRows ?? []) as CheckinRow[]).map(
      (checkin) => `${checkin.habit_id}:${checkin.checkin_date}`,
    ),
  );

  return {
    error: null,
    habits: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      icon: habit.icon || "○",
      color: habit.color || "#5f8f88",
      sortOrder: habit.sort_order ?? 0,
      week: week.map((day) => ({
        ...day,
        completed: completed.has(`${habit.id}:${day.key}`),
      })),
    })),
  };
}
