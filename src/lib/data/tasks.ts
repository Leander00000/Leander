import "server-only";

import { getAppMode } from "@/lib/config";
import { getDateKey } from "@/lib/date";
import { demoTodayTasks, demoUpcomingTasks } from "@/lib/demo-data";
import {
  getTodayAndOverdueTasks,
  getUpcomingTasks,
  TodoistApiError,
  type TodoistTask,
} from "@/lib/todoist";
import type { DashboardTask, IntegrationState } from "@/lib/types";

export type TasksResult = {
  todayTasks: DashboardTask[];
  upcomingTasks: DashboardTask[];
  state: IntegrationState;
  error: string | null;
};

const TIME_ZONE = "Europe/Amsterdam";

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTimeLabel(task: TodoistTask) {
  if (!task.due?.date.includes("T")) return null;

  const date = new Date(task.due.date);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: task.due.timezone || TIME_ZONE,
  }).format(date);
}

function getDueLabel(
  task: TodoistTask,
  dueDate: string | undefined,
  overdue: boolean,
) {
  if (overdue) return "Overdue";
  if (!dueDate) return undefined;

  const today = getDateKey();
  const time = getTimeLabel(task);

  if (dueDate === today) {
    return time ?? "Today";
  }

  if (dueDate === addDays(today, 1)) {
    return time ? `Tomorrow · ${time}` : "Tomorrow";
  }

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dueDate}T12:00:00Z`));

  return time ? `${formattedDate} · ${time}` : formattedDate;
}

export function toDashboardTask(task: TodoistTask): DashboardTask {
  const dueDate = (task.due?.date ?? task.deadline?.date)?.slice(0, 10);
  const overdue = Boolean(dueDate && dueDate < getDateKey());

  return {
    id: task.id,
    content: task.content,
    description: task.description || undefined,
    priority: task.priority,
    dueDate,
    dueLabel: getDueLabel(task, dueDate, overdue),
    overdue,
  };
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof TodoistApiError)) {
    return "Todoist could not be reached. Your habits are still available.";
  }

  if (error.code === "UNAUTHORIZED") {
    return "Todoist needs a new API token.";
  }

  if (error.code === "RATE_LIMITED") {
    return "Todoist is briefly rate limited. Try again in a moment.";
  }

  return "Todoist could not be reached. Your habits are still available.";
}

export async function getTasks(): Promise<TasksResult> {
  if (getAppMode() === "demo") {
    return {
      todayTasks: demoTodayTasks,
      upcomingTasks: demoUpcomingTasks,
      state: "preview",
      error: null,
    };
  }

  if (!process.env.TODOIST_API_TOKEN?.trim()) {
    return {
      todayTasks: [],
      upcomingTasks: [],
      state: "not-connected",
      error: null,
    };
  }

  try {
    const [todayTasks, upcomingTasks] = await Promise.all([
      getTodayAndOverdueTasks(),
      getUpcomingTasks(),
    ]);

    return {
      todayTasks: todayTasks
        .filter((task) => !task.checked)
        .map(toDashboardTask),
      upcomingTasks: upcomingTasks
        .filter((task) => !task.checked)
        .map(toDashboardTask),
      state: "connected",
      error: null,
    };
  } catch (error) {
    return {
      todayTasks: [],
      upcomingTasks: [],
      state: "connected",
      error: getErrorMessage(error),
    };
  }
}
