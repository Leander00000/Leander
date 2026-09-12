import "server-only";

import { getDemoHabits } from "@/lib/demo-data";
import { getDateKey } from "@/lib/date";
import {
  calculateProgress,
  type Activity,
  type ProgressResult,
} from "@/lib/gamification";
import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/types";

export async function getProgress(viewer: Viewer): Promise<ProgressResult> {
  const today = getDateKey();
  if (viewer.isDemo) {
    const activities: Activity[] = getDemoHabits().flatMap((habit) =>
      habit.week
        .filter((day) => day.completed)
        .map((day) => ({
          id: `habit:${habit.id}:${day.key}`,
          kind: "habit",
          habitId: habit.id,
          date: day.key,
        })),
    );
    return {
      progress: calculateProgress(activities, today),
      error: null,
      activities,
    };
  }
  try {
    const supabase = await createClient();
    const activities: Activity[] = [];
    // Explicit pagination avoids silently capping lifetime XP at Supabase's row limit.
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from("habit_checkins")
        .select("habit_id,checkin_date")
        .eq("user_id", viewer.id)
        .lte("checkin_date", today)
        .order("checkin_date")
        .order("habit_id")
        .range(offset, offset + 999);
      if (error) throw error;
      for (const row of data ?? [])
        activities.push({
          id: `habit:${row.habit_id}:${row.checkin_date}`,
          kind: "habit",
          habitId: row.habit_id,
          date: row.checkin_date,
        });
      if (!data || data.length < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from("task_completions")
        .select("task_id,occurrence,completed_date")
        .eq("user_id", viewer.id)
        .eq("status", "completed")
        .lte("completed_date", today)
        .order("task_id")
        .order("occurrence")
        .range(offset, offset + 999);
      if (error) throw error;
      for (const row of data ?? [])
        activities.push({
          id: `task:${row.task_id}:${row.occurrence}`,
          kind: "task",
          date: row.completed_date,
        });
      if (!data || data.length < 1000) break;
    }
    const { data: pending, error: pendingError } = await supabase
      .from("task_completions")
      .select("task_id,occurrence")
      .eq("user_id", viewer.id)
      .eq("status", "pending")
      .order("created_at")
      .limit(100);
    if (pendingError) throw pendingError;
    return {
      progress: calculateProgress(activities, today),
      error: null,
      pendingTasks: (pending ?? []).map((row) => ({
        taskId: row.task_id,
        occurrence: Number(row.occurrence),
      })),
    };
  } catch {
    return {
      progress: null,
      error:
        "Progress could not be loaded. Your saved activity is safe; try refreshing.",
    };
  }
}
