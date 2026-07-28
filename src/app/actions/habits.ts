"use server";

import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { getWeekDates } from "@/lib/date";
import {
  DEFAULT_HABIT_CATEGORY,
  DEFAULT_HABIT_ICON,
  isHabitCategory,
  isHabitIcon,
} from "@/lib/habit-options";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export type HabitActionResult = {
  ok: boolean;
  message?: string;
  completed?: boolean;
  habit?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    category: string;
  };
};

function isValidDateKey(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value;
}

function isVisibleCheckinDate(value: string) {
  return getWeekDates().some((day) => day.key === value);
}

function parseHabitDetails(input: {
  name: string;
  icon: string;
  color: string;
  category: string;
}) {
  const name = input.name.trim();
  const icon = input.icon.trim();
  const category = input.category.trim();
  const color = COLOR_PATTERN.test(input.color) ? input.color : "#5f8f88";

  if (name.length < 1 || name.length > 80) {
    return {
      error: "Use a habit name between 1 and 80 characters.",
    } as const;
  }

  if (!isHabitIcon(icon)) {
    return { error: "Choose one of the available habit icons." } as const;
  }

  if (!isHabitCategory(category)) {
    return { error: "Choose one of the available categories." } as const;
  }

  return {
    details: {
      name,
      icon,
      color,
      category,
    },
  } as const;
}

function revalidateHabits() {
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function toggleHabitAction(input: {
  habitId: string;
  date: string;
  completed: boolean;
}): Promise<HabitActionResult> {
  const viewer = await requireViewer();

  if (viewer.isDemo) {
    return { ok: true, completed: input.completed };
  }

  if (
    !UUID_PATTERN.test(input.habitId) ||
    !isValidDateKey(input.date) ||
    !isVisibleCheckinDate(input.date)
  ) {
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

  revalidateHabits();
  return { ok: true, completed: input.completed };
}

export async function createHabitAction(input: {
  name: string;
  icon: string;
  color: string;
  category: string;
}): Promise<HabitActionResult> {
  const viewer = await requireViewer();
  const parsed = parseHabitDetails(input);

  if ("error" in parsed) {
    return { ok: false, message: parsed.error };
  }

  const { name, icon, color, category } = parsed.details;

  if (viewer.isDemo) {
    return {
      ok: true,
      habit: {
        id: `demo-${Date.now()}`,
        name,
        icon,
        color,
        category,
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
      category,
      sort_order: 999,
    })
    .select("id,name,icon,color,category")
    .single();

  if (error || !data) {
    return { ok: false, message: "The habit could not be added." };
  }

  revalidateHabits();

  return {
    ok: true,
    habit: {
      id: String(data.id),
      name: String(data.name),
      icon: String(data.icon || DEFAULT_HABIT_ICON),
      color: String(data.color || "#5f8f88"),
      category: String(data.category || DEFAULT_HABIT_CATEGORY),
    },
  };
}

export async function updateHabitAction(input: {
  habitId: string;
  name: string;
  icon: string;
  color: string;
  category: string;
}): Promise<HabitActionResult> {
  const viewer = await requireViewer();
  const parsed = parseHabitDetails(input);

  if (!UUID_PATTERN.test(input.habitId) && !viewer.isDemo) {
    return { ok: false, message: "That habit is not valid." };
  }

  if ("error" in parsed) {
    return { ok: false, message: parsed.error };
  }

  const { name, icon, color, category } = parsed.details;

  if (viewer.isDemo) {
    return {
      ok: true,
      habit: {
        id: input.habitId,
        name,
        icon,
        color,
        category,
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habits")
    .update({ name, icon, color, category })
    .eq("id", input.habitId)
    .eq("user_id", viewer.id)
    .select("id,name,icon,color,category")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "The habit could not be updated." };
  }

  revalidateHabits();
  return {
    ok: true,
    habit: {
      id: String(data.id),
      name: String(data.name),
      icon: String(data.icon || DEFAULT_HABIT_ICON),
      color: String(data.color || "#5f8f88"),
      category: String(data.category || DEFAULT_HABIT_CATEGORY),
    },
  };
}

export async function deleteHabitAction(
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
  const { data, error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", viewer.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "The habit could not be deleted." };
  }

  revalidateHabits();
  return { ok: true };
}
