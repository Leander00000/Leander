import "server-only";

import { getAppMode } from "@/lib/config";
import { getDateKey } from "@/lib/date";
import { demoTasks } from "@/lib/demo-data";
import {
  getTodayAndOverdueTasks,
  TodoistApiError,
  type TodoistTask,
} from "@/lib/todoist";
import type { DashboardTask, IntegrationState } from "@/lib/types";

export type TasksResult = {
  tasks: DashboardTask[];
  state: IntegrationState;
  error: string | null;
};

function getDueLabel(task: TodoistTask, overdue: boolean) {
  if (overdue) return "Overdue";
  if (!task.due) return undefined;

  if (task.due.date.includes("T")) {
    const date = new Date(task.due.date);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: task.due.timezone || "Europe/Amsterdam",
      }).format(date);
    }
  }

  return "Today";
}

export function toDashboardTask(task: TodoistTask): DashboardTask {
  const dueDate = task.due?.date.slice(0, 10);
  const overdue = Boolean(dueDate && dueDate < getDateKey());

  return {
    id: task.id,
    content: task.content,
    description: task.description || undefined,
    priority: task.priority,
    dueLabel: getDueLabel(task, overdue),
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
      tasks: demoTasks,
      state: "preview",
      error: null,
    };
  }

  if (!process.env.TODOIST_API_TOKEN?.trim()) {
    return {
      tasks: [],
      state: "not-connected",
      error: null,
    };
  }

  try {
    const tasks = await getTodayAndOverdueTasks();

    return {
      tasks: tasks.filter((task) => !task.checked).map(toDashboardTask),
      state: "connected",
      error: null,
    };
  } catch (error) {
    return {
      tasks: [],
      state: "connected",
      error: getErrorMessage(error),
    };
  }
}
