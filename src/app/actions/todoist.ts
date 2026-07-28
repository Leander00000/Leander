"use server";

import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { getAppMode } from "@/lib/config";
import { toDashboardTask } from "@/lib/data/tasks";
import {
  closeTask,
  quickAddTask,
  TodoistApiError,
} from "@/lib/todoist";
import type { DashboardTask } from "@/lib/types";

type TodoistActionResult = {
  ok: boolean;
  message?: string;
  task?: DashboardTask;
};

const TASK_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function actionError(error: unknown) {
  if (error instanceof TodoistApiError && error.code === "UNAUTHORIZED") {
    return "Todoist needs a new API token.";
  }

  return "Todoist could not save that change. Try again.";
}

export async function completeTaskAction(
  taskId: string,
): Promise<TodoistActionResult> {
  await requireViewer();

  if (!TASK_ID_PATTERN.test(taskId)) {
    return { ok: false, message: "That Todoist task is not valid." };
  }

  if (getAppMode() === "demo") {
    return { ok: true };
  }

  try {
    await closeTask(taskId);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function quickAddTaskAction(
  rawContent: string,
): Promise<TodoistActionResult> {
  await requireViewer();
  const content = rawContent.trim();

  if (content.length < 1 || content.length > 500) {
    return {
      ok: false,
      message: "Use a task description between 1 and 500 characters.",
    };
  }

  if (getAppMode() === "demo") {
    return {
      ok: true,
      task: {
        id: `demo-task-${Date.now()}`,
        content,
        priority: 1,
        dueLabel: "Today",
        overdue: false,
      },
    };
  }

  try {
    const task = await quickAddTask(`${content} today`);
    revalidatePath("/");
    return { ok: true, task: toDashboardTask(task) };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
