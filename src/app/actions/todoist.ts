"use server";

import { randomUUID } from "node:crypto";
import { getDateKey } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { getAppMode } from "@/lib/config";
import { toDashboardTask } from "@/lib/data/tasks";
import {
  closeTask,
  getTask,
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
  occurrence = 0,
): Promise<TodoistActionResult> {
  const viewer = await requireViewer();

  if (
    !TASK_ID_PATTERN.test(taskId) ||
    !Number.isSafeInteger(occurrence) ||
    occurrence < 0
  ) {
    return { ok: false, message: "That Todoist task is not valid." };
  }

  if (getAppMode() === "demo") {
    return { ok: true };
  }

  try {
    const supabase = await createClient();
    const findCompletion = () =>
      supabase
        .from("task_completions")
        .select("command_id,status")
        .eq("user_id", viewer.id)
        .eq("task_id", taskId)
        .eq("occurrence", occurrence)
        .maybeSingle();
    const existing = await findCompletion();
    if (existing.error)
      return {
        ok: false,
        message:
          "Task progress is unavailable. Please try again after setup is complete.",
      };
    let completion = existing.data;
    if (!completion) {
      const task = await getTask(taskId);
      if (
        task.checked ||
        task.is_deleted ||
        task.completed_count !== occurrence
      ) {
        return {
          ok: false,
          message:
            "This task changed in Todoist. Refresh your tasks and try again.",
        };
      }
      const { error } = await supabase.from("task_completions").insert({
        user_id: viewer.id,
        task_id: taskId,
        occurrence,
        command_id: randomUUID(),
        status: "pending",
        completed_date: getDateKey(),
      });
      if (error && error.code !== "23505") throw error;
      const saved = await findCompletion();
      if (saved.error || !saved.data)
        throw saved.error ?? new Error("Completion unavailable");
      completion = saved.data;
    }
    if (completion.status === "completed")
      return {
        ok: true,
        message: "Task already completed. XP already counted.",
      };
    await closeTask(taskId, completion.command_id);
    const { error: saveError } = await supabase
      .from("task_completions")
      .update({ status: "completed" })
      .eq("user_id", viewer.id)
      .eq("task_id", taskId)
      .eq("occurrence", occurrence);
    if (saveError)
      return {
        ok: false,
        message:
          "Todoist completed the task. Tap complete again to safely retry saving its XP.",
      };
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
