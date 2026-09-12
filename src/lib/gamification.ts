export const HABIT_XP = 10;
export const TASK_XP = 20;
export const LEVEL_XP = 200;
export const DAILY_GOAL_XP = 50;

export type Activity = {
  id: string;
  kind: "habit" | "task";
  date: string;
  habitId?: string;
};

export function previousDay(key: string) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function streakForDates(values: string[], today: string) {
  const dates = new Set(values.filter((date) => date <= today));
  let day = dates.has(today) ? today : previousDay(today);
  let current = 0;
  while (dates.has(day)) {
    current++;
    day = previousDay(day);
  }
  let best = 0;
  let run = 0;
  let previous = "";
  for (const date of [...dates].sort()) {
    run = previousDay(date) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return { current, best };
}

export function calculateProgress(activities: Activity[], today: string) {
  const unique = [
    ...new Map(
      activities
        .filter((item) => item.date <= today)
        .map((item) => [item.id, item]),
    ).values(),
  ];
  const habits = unique.filter((item) => item.kind === "habit");
  const tasks = unique.filter((item) => item.kind === "task");
  const xp = habits.length * HABIT_XP + tasks.length * TASK_XP;
  const todayXp = unique
    .filter((item) => item.date === today)
    .reduce(
      (sum, item) => sum + (item.kind === "habit" ? HABIT_XP : TASK_XP),
      0,
    );
  const streak = streakForDates(
    unique.map((item) => item.date),
    today,
  );
  const habitStreaks: Record<string, { current: number; best: number }> = {};
  for (const id of new Set(
    habits
      .map((item) => item.habitId)
      .filter((id): id is string => Boolean(id)),
  )) {
    habitStreaks[id] = streakForDates(
      habits.filter((item) => item.habitId === id).map((item) => item.date),
      today,
    );
  }
  const badges = [
    {
      name: "First step",
      description: "Complete your first task or habit",
      earned: unique.length >= 1,
    },
    {
      name: "Finding rhythm",
      description: "Be active on 3 consecutive days",
      earned: streak.best >= 3,
    },
    {
      name: "Full week",
      description: "Be active on 7 consecutive days",
      earned: streak.best >= 7,
    },
    {
      name: "Getting things done",
      description: "Complete 25 tasks here",
      earned: tasks.length >= 25,
    },
    {
      name: "Habit builder",
      description: "Save 50 habit check-ins",
      earned: habits.length >= 50,
    },
    {
      name: "A thousand small steps",
      description: "Earn 1,000 XP",
      earned: xp >= 1000,
    },
  ];
  return {
    xp,
    todayXp,
    level: Math.floor(xp / LEVEL_XP) + 1,
    levelXp: xp % LEVEL_XP,
    streak,
    habitStreaks,
    badges,
    tasks: tasks.length,
    checkins: habits.length,
  };
}

export type Progress = ReturnType<typeof calculateProgress>;
export type ProgressResult = {
  progress: Progress | null;
  error: string | null;
  activities?: Activity[];
  pendingTasks?: Array<{ taskId: string; occurrence: number }>;
};
