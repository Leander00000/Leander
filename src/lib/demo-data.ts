import { getDateKey, getWeekDates } from "@/lib/date";
import type { DashboardTask, HabitView } from "@/lib/types";

function getRelativeDateKey(days: number) {
  const date = new Date(`${getDateKey()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getRelativeDateLabel(days: number) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${getRelativeDateKey(days)}T12:00:00Z`));
}

const HABITS = [
  {
    id: "demo-water",
    name: "Drink enough water",
    icon: "💧",
    color: "#5f8f88",
    category: "Health",
    sortOrder: 0,
    completedDays: [true, true, false, true, true, false, true],
  },
  {
    id: "demo-walk",
    name: "Walk outside",
    icon: "🌿",
    color: "#80975b",
    category: "Movement",
    sortOrder: 1,
    completedDays: [false, true, true, true, false, true, false],
  },
  {
    id: "demo-read",
    name: "Read for 20 minutes",
    icon: "📖",
    color: "#b87964",
    category: "Mind",
    sortOrder: 2,
    completedDays: [true, true, true, false, true, true, false],
  },
  {
    id: "demo-plan",
    name: "Plan tomorrow",
    icon: "✎",
    color: "#9b7b45",
    category: "Focus",
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
    category: habit.category,
    sortOrder: habit.sortOrder,
    week: week.map((day, index) => ({
      ...day,
      completed: habit.completedDays[index],
    })),
  }));
}

export const demoTodayTasks: DashboardTask[] = [
  {
    id: "demo-task-1",
    content: "Review notes for the introduction",
    description: "Bring the source map up to date.",
    priority: 4,
    project: "Thesis",
    dueDate: getRelativeDateKey(-1),
    dueLabel: "Overdue",
    overdue: true,
  },
  {
    id: "demo-task-2",
    content: "Reply to two important messages",
    priority: 2,
    project: "Personal",
    dueDate: getRelativeDateKey(0),
    dueLabel: "10:30",
    overdue: false,
  },
  {
    id: "demo-task-3",
    content: "Prepare tomorrow’s focus block",
    priority: 1,
    project: "Planning",
    dueDate: getRelativeDateKey(0),
    dueLabel: "Today",
    overdue: false,
  },
  {
    id: "demo-task-4",
    content: "Take a proper lunch break",
    priority: 1,
    project: "Personal",
    dueDate: getRelativeDateKey(0),
    dueLabel: "12:30",
    overdue: false,
  },
];

export const demoUpcomingTasks: DashboardTask[] = [
  ...demoTodayTasks.filter((task) => !task.overdue),
  {
    id: "demo-task-5",
    content: "Plan next week's thesis work",
    priority: 3,
    project: "Thesis",
    dueDate: getRelativeDateKey(1),
    dueLabel: "Tomorrow",
    overdue: false,
  },
  {
    id: "demo-task-6",
    content: "Buy groceries",
    priority: 1,
    project: "Personal",
    dueDate: getRelativeDateKey(3),
    dueLabel: getRelativeDateLabel(3),
    overdue: false,
  },
];
