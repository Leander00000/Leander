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
import {
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  completeTaskAction,
  quickAddTaskAction,
} from "@/app/actions/todoist";
import { getDateKey } from "@/lib/date";
import type { DashboardTask, IntegrationState } from "@/lib/types";

type TodoistCardProps = {
  initialTodayTasks: DashboardTask[];
  initialUpcomingTasks: DashboardTask[];
  state: IntegrationState;
  error?: string | null;
};

type TaskView = "today" | "upcoming";

function PriorityLabel({ priority }: { priority: number }) {
  if (priority < 3) return null;

  return (
    <span className="priority-label" data-priority={priority}>
      P{5 - priority}
    </span>
  );
}

function formatUpcomingGroup(dateKey: string | undefined) {
  if (!dateKey) return "Upcoming";

  const today = getDateKey();
  if (dateKey === today) return "Today";

  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (dateKey === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function TaskRow({
  task,
  isPending,
  onComplete,
}: {
  task: DashboardTask;
  isPending: boolean;
  onComplete: (taskId: string) => void;
}) {
  return (
    <div className="task-row">
      <button
        className="task-complete"
        type="button"
        disabled={isPending}
        onClick={() => onComplete(task.id)}
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

export function TodoistCard({
  initialTodayTasks,
  initialUpcomingTasks,
  state,
  error,
}: TodoistCardProps) {
  const router = useRouter();
  const quickAddForm = useRef<HTMLFormElement>(null);
  const [view, setView] = useState<TaskView>("today");
  const [todayTasks, setTodayTasks] = useState(initialTodayTasks);
  const [upcomingTasks, setUpcomingTasks] = useState(initialUpcomingTasks);
  const [showAll, setShowAll] = useState(false);
  const [status, setStatus] = useState<string | null>(error ?? null);
  const [isPending, startTransition] = useTransition();

  const activeTasks = view === "today" ? todayTasks : upcomingTasks;
  const visibleTasks = showAll ? activeTasks : activeTasks.slice(0, 8);

  const todayGroups = useMemo(
    () => [
      {
        key: "overdue",
        label: "Overdue",
        tasks: visibleTasks.filter((task) => task.overdue),
      },
      {
        key: "today",
        label: "Today",
        tasks: visibleTasks.filter((task) => !task.overdue),
      },
    ],
    [visibleTasks],
  );

  const upcomingGroups = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; label: string; tasks: DashboardTask[] }
    >();

    for (const task of visibleTasks) {
      const key = task.dueDate ?? "upcoming";
      const existing = groups.get(key);

      if (existing) {
        existing.tasks.push(task);
      } else {
        groups.set(key, {
          key,
          label: formatUpcomingGroup(task.dueDate),
          tasks: [task],
        });
      }
    }

    return Array.from(groups.values());
  }, [visibleTasks]);

  const taskGroups = view === "today" ? todayGroups : upcomingGroups;

  function changeView(nextView: TaskView) {
    setView(nextView);
    setShowAll(false);
    setStatus(null);
  }

  function completeTask(taskId: string) {
    const previousToday = todayTasks;
    const previousUpcoming = upcomingTasks;
    setStatus(null);
    setTodayTasks((current) =>
      current.filter((task) => task.id !== taskId),
    );
    setUpcomingTasks((current) =>
      current.filter((task) => task.id !== taskId),
    );

    startTransition(async () => {
      const result = await completeTaskAction(taskId);
      if (!result.ok) {
        setTodayTasks(previousToday);
        setUpcomingTasks(previousUpcoming);
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

      const task = result.task;
      setTodayTasks((current) => [...current, task]);
      setUpcomingTasks((current) => [...current, task]);
      setStatus("Task added to today.");
      quickAddForm.current?.reset();
    });
  }

  return (
    <section className="dashboard-card todoist-card">
      <div className="card-heading">
        <div>
          <p className="card-kicker">Todoist</p>
          <h2>{view === "today" ? "Today’s tasks" : "Upcoming"}</h2>
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

      <div className="todoist-tabs" role="tablist" aria-label="Todoist range">
        <button
          type="button"
          role="tab"
          aria-selected={view === "today"}
          data-selected={view === "today" || undefined}
          onClick={() => changeView("today")}
        >
          Today
          <span>{todayTasks.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "upcoming"}
          data-selected={view === "upcoming" || undefined}
          onClick={() => changeView("upcoming")}
        >
          Upcoming
          <span>{upcomingTasks.length}</span>
        </button>
      </div>

      {view === "upcoming" ? (
        <p className="card-helper">Tasks due over the coming week.</p>
      ) : null}

      {error ? (
        <div className="inline-alert" role="alert">
          <p>{error}</p>
          <button
            className="text-button"
            type="button"
            onClick={() => router.refresh()}
          >
            Try again
          </button>
        </div>
      ) : state === "not-connected" ? (
        <div className="empty-state compact-empty">
          <span className="empty-symbol" aria-hidden="true">
            +
          </span>
          <div>
            <h3>Connect Todoist to see your tasks.</h3>
            <p>Add one private server-side token in Vercel.</p>
          </div>
        </div>
      ) : activeTasks.length === 0 ? (
        <div className="empty-state compact-empty">
          <span className="empty-symbol" aria-hidden="true">
            <Check size={20} />
          </span>
          <div>
            <h3>
              {view === "today"
                ? "Nothing due today."
                : "Nothing due in the next seven days."}
            </h3>
            <p>
              {view === "today"
                ? "You can add a task, or enjoy the space."
                : "Your upcoming list is clear."}
            </p>
          </div>
        </div>
      ) : (
        <div className="task-groups">
          {taskGroups.map((group) =>
            group.tasks.length > 0 ? (
              <div className="task-group" key={group.key}>
                <p
                  className={`task-group-label ${
                    group.key === "overdue" ? "overdue-label" : ""
                  }`}
                >
                  {group.label}
                </p>
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isPending={isPending}
                    onComplete={completeTask}
                  />
                ))}
              </div>
            ) : null,
          )}
          {activeTasks.length > 8 ? (
            <button
              className="show-all-button"
              type="button"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Show fewer" : `Show all ${activeTasks.length}`}
              <ChevronDown
                aria-hidden="true"
                size={16}
                data-open={showAll || undefined}
              />
            </button>
          ) : null}
        </div>
      )}

      {view === "today" && state !== "not-connected" && !error ? (
        <form ref={quickAddForm} className="quick-add-form" action={addTask}>
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
          href={
            view === "today"
              ? "https://app.todoist.com/app/today"
              : "https://app.todoist.com/app/upcoming"
          }
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
