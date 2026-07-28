"use client";

import {
  ArrowUpRight,
  Check,
  ChevronDown,
  LoaderCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  completeTaskAction,
  quickAddTaskAction,
} from "@/app/actions/todoist";
import type { DashboardTask, IntegrationState } from "@/lib/types";

type TodoistCardProps = {
  initialTasks: DashboardTask[];
  state: IntegrationState;
  error?: string | null;
};

function PriorityLabel({ priority }: { priority: number }) {
  if (priority < 3) return null;

  return (
    <span className="priority-label" data-priority={priority}>
      P{5 - priority}
    </span>
  );
}

export function TodoistCard({
  initialTasks,
  state,
  error,
}: TodoistCardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [showAll, setShowAll] = useState(false);
  const [status, setStatus] = useState<string | null>(error ?? null);
  const [isPending, startTransition] = useTransition();

  const visibleTasks = useMemo(
    () => (showAll ? tasks : tasks.slice(0, 8)),
    [showAll, tasks],
  );
  const overdue = visibleTasks.filter((task) => task.overdue);
  const today = visibleTasks.filter((task) => !task.overdue);

  function completeTask(taskId: string) {
    const previous = tasks;
    setStatus(null);
    setTasks((current) => current.filter((task) => task.id !== taskId));

    startTransition(async () => {
      const result = await completeTaskAction(taskId);
      if (!result.ok) {
        setTasks(previous);
        setStatus(result.message ?? "The task was not completed.");
      } else {
        setStatus("Task completed.");
      }
    });
  }

  function addTask(formData: FormData) {
    const content = String(formData.get("content") ?? "");
    setStatus(null);

    startTransition(async () => {
      const result = await quickAddTaskAction(content);
      if (!result.ok || !result.task) {
        setStatus(result.message ?? "The task could not be added.");
        return;
      }

      setTasks((current) => [...current, result.task!]);
      setStatus("Task added to today.");
      const form = document.querySelector<HTMLFormElement>(".quick-add-form");
      form?.reset();
    });
  }

  function renderTask(task: DashboardTask) {
    return (
      <div className="task-row" key={task.id}>
        <button
          className="task-complete"
          type="button"
          disabled={isPending}
          onClick={() => completeTask(task.id)}
          aria-label={`Complete ${task.content}`}
        >
          <Check aria-hidden="true" size={16} />
        </button>
        <div className="task-copy">
          <strong>{task.content}</strong>
          {task.description ? <p>{task.description}</p> : null}
          <div className="task-meta">
            {task.dueLabel ? (
              <span data-overdue={task.overdue || undefined}>
                {task.dueLabel}
              </span>
            ) : null}
            {task.project ? <span>{task.project}</span> : null}
            <PriorityLabel priority={task.priority} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="dashboard-card todoist-card">
      <div className="card-heading">
        <div>
          <p className="card-kicker">Todoist</p>
          <h2>Today&apos;s tasks</h2>
        </div>
        <div className="card-tools">
          <span className="status-pill">
            {state === "connected"
              ? "Connected"
              : state === "preview"
                ? "Preview"
                : "Not connected"}
          </span>
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              setStatus(null);
              router.refresh();
            }}
            disabled={isPending}
            aria-label="Refresh Todoist tasks"
            title="Refresh"
          >
            <RefreshCw aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="inline-alert" role="alert">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={() => router.refresh()}>
            Try again
          </button>
        </div>
      ) : state === "not-connected" ? (
        <div className="empty-state compact-empty">
          <span className="empty-symbol" aria-hidden="true">
            +
          </span>
          <div>
            <h3>Connect Todoist to see today&apos;s tasks.</h3>
            <p>Add one private server-side token in Vercel.</p>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state compact-empty">
          <span className="empty-symbol" aria-hidden="true">
            <Check size={20} />
          </span>
          <div>
            <h3>Nothing due today.</h3>
            <p>You can add a task, or enjoy the space.</p>
          </div>
        </div>
      ) : (
        <div className="task-groups">
          {overdue.length > 0 ? (
            <div className="task-group">
              <p className="task-group-label overdue-label">Overdue</p>
              {overdue.map(renderTask)}
            </div>
          ) : null}
          {today.length > 0 ? (
            <div className="task-group">
              <p className="task-group-label">Today</p>
              {today.map(renderTask)}
            </div>
          ) : null}
          {tasks.length > 8 ? (
            <button
              className="show-all-button"
              type="button"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Show fewer" : `Show all ${tasks.length}`}
              <ChevronDown
                aria-hidden="true"
                size={16}
                data-open={showAll || undefined}
              />
            </button>
          ) : null}
        </div>
      )}

      {state !== "not-connected" && !error ? (
        <form className="quick-add-form" action={addTask}>
          <Plus aria-hidden="true" size={17} />
          <input
            name="content"
            placeholder="Add a task for today"
            maxLength={500}
            aria-label="Task description"
            required
          />
          <button
            className="button button-primary button-small"
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircle className="spin" aria-hidden="true" size={15} />
            ) : null}
            Add
          </button>
        </form>
      ) : null}

      <div className="card-footer">
        <a
          className="text-link"
          href="https://app.todoist.com/app/today"
          target="_blank"
          rel="noreferrer"
        >
          Open Todoist
          <ArrowUpRight aria-hidden="true" size={15} />
        </a>
      </div>

      <p className="sr-status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
