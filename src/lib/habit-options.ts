export const HABIT_CATEGORIES = [
  "General",
  "Health",
  "Movement",
  "Mind",
  "Focus",
  "Home",
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export const HABIT_ICONS = [
  "○",
  "💧",
  "🏃",
  "🧘",
  "📖",
  "🎯",
  "🌙",
  "🥗",
  "🧹",
  "💊",
  "✍️",
  "🌿",
] as const;

export const DEFAULT_HABIT_CATEGORY: HabitCategory = "General";
export const DEFAULT_HABIT_ICON = "○";

export function isHabitCategory(value: string): value is HabitCategory {
  return HABIT_CATEGORIES.some((category) => category === value);
}

export function isHabitIcon(value: string): boolean {
  return HABIT_ICONS.some((icon) => icon === value);
}
