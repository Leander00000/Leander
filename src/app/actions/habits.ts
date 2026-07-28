"use server";

import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export type HabitActionResult = {
  ok: boolean;
  message?: string;
  habit?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
};

function isValidDateKey(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime());
}

export async function toggleHabitAction(input: {
  habitId: string;
  date: string;
  completed: boolean;
}): Promise<HabitActionResult> {
  const viewer = await requireViewer();

  if (viewer.isDemo) {
    return { ok: true };
  }

  if (!UUID_PATTERN.test(input.habitId) || !isValidDateKey(input.date)) {
    return { ok: false, message: "That habit check-in is not valid." };
  }

  const supabase = await createClient();
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id")
    .eq("id", input.habitId)
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (habitError || !habit) {
    return { ok: false, message: "That habit could not be found." };
  }

  const result = input.completed
    ? await supabase.from("habit_checkins").upsert(
        {
          habit_id: input.habitId,
          user_id: viewer.id,
          checkin_date: input.date,
        },
        { onConflict: "habit_id,checkin_date" },
      )
    : await supabase
        .from("habit_checkins")
        .delete()
        .eq("habit_id", input.habitId)
        .eq("user_id", viewer.id)
        .eq("checkin_date", input.date);

  if (result.error) {
    return {
      ok: false,
      message: "That check-in was not saved. Try again.",
    };
  }

  revalidatePath("/");
  revalidatePath("/habits");
  return { ok: true };
}

export async function createHabitAction(input: {
  name: string;
  icon: string;
  color: string;
}): Promise<HabitActionResult> {
  const viewer = await requireViewer();
  const name = input.name.trim();
  const icon = input.icon.trim().slice(0, 8) || "○";
  const color = COLOR_PATTERN.test(input.color) ? input.color : "#5f8f88";

  if (name.length < 1 || name.length > 80) {
    return {
      ok: false,
      message: "Use a habit name between 1 and 80 characters.",
    };
  }

  if (viewer.isDemo) {
    return {
      ok: true,
      habit: {
        id: `demo-${Date.now()}`,
        name,
        icon,
        color,
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: viewer.id,
      name,
      icon,
      color,
      sort_order: 999,
    })
    .select("id,name,icon,color")
    .single();

  if (error || !data) {
    return { ok: false, message: "The habit could not be added." };
  }

  revalidatePath("/");
  revalidatePath("/habits");

  return {
    ok: true,
    habit: {
      id: String(data.id),
      name: String(data.name),
      icon: String(data.icon || "○"),
      color: String(data.color || "#5f8f88"),
    },
  };
}

export async function archiveHabitAction(
  habitId: string,
): Promise<HabitActionResult> {
  const viewer = await requireViewer();

  if (viewer.isDemo) {
    return { ok: true };
  }

  if (!UUID_PATTERN.test(habitId)) {
    return { ok: false, message: "That habit is not valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", habitId)
    .eq("user_id", viewer.id);

  if (error) {
    return { ok: false, message: "The habit could not be archived." };
  }

  revalidatePath("/");
  revalidatePath("/habits");
  return { ok: true };
}
