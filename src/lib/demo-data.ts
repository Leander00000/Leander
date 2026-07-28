import { getWeekDates } from "@/lib/date";
import type { DashboardTask, HabitView } from "@/lib/types";

const HABITS = [
  {
    id: "demo-water",
    name: "Drink enough water",
    icon: "💧",
    color: "#5f8f88",
    sortOrder: 0,
    completedDays: [true, true, false, true, true, false, true],
  },
  {
    id: "demo-walk",
    name: "Walk outside",
    icon: "🌿",
    color: "#80975b",
    sortOrder: 1,
    completedDays: [false, true, true, true, false, true, false],
  },
  {
    id: "demo-read",
    name: "Read for 20 minutes",
    icon: "📖",
    color: "#b87964",
    sortOrder: 2,
    completedDays: [true, true, true, false, true, true, false],
  },
  {
    id: "demo-plan",
    name: "Plan tomorrow",
    icon: "✎",
    color: "#9b7b45",
    sortOrder: 3,
    completedDays: [true, false, true, true, true, false, false],
  },
];

export function getDemoHabits(): HabitView[] {
  const week = getWeekDates();

  return HABITS.map((habit) => ({
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    sortOrder: habit.sortOrder,
    week: week.map((day, index) => ({
      ...day,
      completed: habit.completedDays[index],
    })),
  }));
}

export const demoTasks: DashboardTask[] = [
  {
    id: "demo-task-1",
    content: "Review notes for the introduction",
    description: "Bring the source map up to date.",
    priority: 4,
    project: "Thesis",
    dueLabel: "Overdue",
    overdue: true,
  },
  {
    id: "demo-task-2",
    content: "Reply to two important messages",
    priority: 2,
    project: "Personal",
    dueLabel: "10:30",
    overdue: false,
  },
  {
    id: "demo-task-3",
    content: "Prepare tomorrow’s focus block",
    priority: 1,
    project: "Planning",
    dueLabel: "Today",
    overdue: false,
  },
  {
    id: "demo-task-4",
    content: "Take a proper lunch break",
    priority: 1,
    project: "Personal",
    dueLabel: "12:30",
    overdue: false,
  },
];

