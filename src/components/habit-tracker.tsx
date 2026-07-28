"use client";

import {
  Archive,
  Check,
  ChevronRight,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  archiveHabitAction,
  createHabitAction,
  toggleHabitAction,
} from "@/app/actions/habits";
import { getWeekDates } from "@/lib/date";
import type { HabitView } from "@/lib/types";

type HabitTrackerProps = {
  initialHabits: HabitView[];
  error?: string | null;
  expanded?: boolean;
};

const COLORS = ["#5f8f88", "#80975b", "#b87964", "#9b7b45", "#7c719d"];

export function HabitTracker({
  initialHabits,
  error,
  expanded = false,
}: HabitTrackerProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [showAdd, setShowAdd] = useState(false);
  const [status, setStatus] = useState<string | null>(error ?? null);
  const [isPending, startTransition] = useTransition();

  const todayCompleted = useMemo(
    () =>
      habits.filter(
        (habit) => habit.week.find((day) => day.isToday)?.completed,
      ).length,
    [habits],
  );

  function toggleHabit(habitId: string, date: string) {
    const habit = habits.find((item) => item.id === habitId);
    const day = habit?.week.find((item) => item.key === date);

    if (!habit || !day || (!expanded && !day.isToday)) return;

    const nextCompleted = !day.completed;
    const previous = habits;
    setStatus(null);
    setHabits((current) =>
      current.map((item) =>
        item.id === habitId
          ? {
              ...item,
              week: item.week.map((weekDay) =>
                weekDay.key === date
                  ? { ...weekDay, completed: nextCompleted }
                  : weekDay,
              ),
            }
          : item,
      ),
    );

    startTransition(async () => {
      const result = await toggleHabitAction({
        habitId,
        date,
        completed: nextCompleted,
      });

      if (!result.ok) {
        setHabits(previous);
        setStatus(result.message ?? "That check-in was not saved.");
      } else {
        setStatus(nextCompleted ? "Habit marked complete." : "Check-in removed.");
      }
    });
  }

  function addHabit(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const icon = String(formData.get("icon") ?? "○");
    const color = String(formData.get("color") ?? COLORS[0]);

    startTransition(async () => {
      const result = await createHabitAction({ name, icon, color });

      if (!result.ok || !result.habit) {
        setStatus(result.message ?? "The habit could not be added.");
        return;
      }

      setHabits((current) => [
        ...current,
        {
          ...result.habit!,
          sortOrder: current.length,
          week: getWeekDates().map((day) => ({ ...day, completed: false })),
        },
      ]);
      setShowAdd(false);
      setStatus("Habit added.");
    });
  }

  function archiveHabit(habitId: string) {
    const previous = habits;
    setHabits((current) => current.filter((habit) => habit.id !== habitId));

    startTransition(async () => {
      const result = await archiveHabitAction(habitId);
      if (!result.ok) {
        setHabits(previous);
        setStatus(result.message ?? "The habit could not be archived.");
      } else {
        setStatus("Habit archived.");
      }
    });
  }

  return (
    <section
      className="dashboard-card habit-card"
      data-expanded={expanded || undefined}
    >
      <div className="card-heading">
        <div>
          <p className="card-kicker">{expanded ? "This week" : "Daily rhythm"}</p>
          <h2>{expanded ? "Habit history" : "Today’s habits"}</h2>
        </div>
        <span className="completion-summary">
          <strong>{todayCompleted}</strong>
          <span aria-hidden="true">/</span>
          <span>{habits.length}</span>
          <small>today</small>
        </span>
      </div>

      {habits.length > 0 ? (
        <div className="habit-table">
          <div className="habit-table-head" aria-hidden="true">
            <span />
            <div className="habit-week habit-week-head">
              {habits[0].week.map((day) => (
                <span className={day.isToday ? "is-today" : ""} key={day.key}>
                  {day.day}
                </span>
              ))}
            </div>
            {expanded ? <span /> : null}
          </div>

          {habits.map((habit) => {
            const completedCount = habit.week.filter(
              (day) => day.completed,
            ).length;

            return (
              <div className="habit-row" key={habit.id}>
                <div className="habit-name">
                  <span
                    className="habit-icon"
                    style={{ "--habit-color": habit.color } as React.CSSProperties}
                    aria-hidden="true"
                  >
                    {habit.icon}
                  </span>
                  <span>
                    <strong>{habit.name}</strong>
                    {expanded ? (
                      <small>{Math.round((completedCount / 7) * 100)}% this week</small>
                    ) : null}
                  </span>
                </div>

                <div className="habit-week">
                  {habit.week.map((day) => (
                    <button
                      className="habit-check"
                      data-completed={day.completed || undefined}
                      data-today={day.isToday || undefined}
                      type="button"
                      key={day.key}
                      onClick={() => toggleHabit(habit.id, day.key)}
                      disabled={isPending || (!expanded && !day.isToday)}
                      aria-label={`${day.completed ? "Mark" : "Mark"} ${habit.name} ${
                        day.completed ? "not complete" : "complete"
                      } for ${day.dayLong}`}
                    >
                      {day.completed ? (
                        <Check aria-hidden="true" size={15} strokeWidth={2.5} />
                      ) : (
                        <span aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>

                {expanded ? (
                  <button
                    className="icon-button archive-button"
                    type="button"
                    onClick={() => archiveHabit(habit.id)}
                    disabled={isPending}
                    aria-label={`Archive ${habit.name}`}
                    title="Archive habit"
                  >
                    <Archive aria-hidden="true" size={16} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <span className="empty-symbol" aria-hidden="true">
            ○
          </span>
          <div>
            <h3>Start with one repeatable habit.</h3>
            <p>Small enough to check off on an ordinary day.</p>
          </div>
        </div>
      )}

      {showAdd ? (
        <form action={addHabit} className="add-habit-form">
          <div className="form-field icon-field">
            <label htmlFor="habit-icon">Icon</label>
            <input
              id="habit-icon"
              name="icon"
              defaultValue="○"
              maxLength={8}
              aria-label="Habit icon or emoji"
            />
          </div>
          <div className="form-field grow-field">
            <label htmlFor="habit-name">Habit name</label>
            <input
              id="habit-name"
              name="name"
              placeholder="e.g. Stretch for five minutes"
              maxLength={80}
              autoFocus
              required
            />
          </div>
          <fieldset className="color-field">
            <legend>Colour</legend>
            <div>
              {COLORS.map((color, index) => (
                <label className="color-choice" key={color}>
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    defaultChecked={index === 0}
                  />
                  <span
                    style={{ "--choice-color": color } as React.CSSProperties}
                    aria-label={color}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <button
            className="button button-primary button-small"
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircle className="spin" aria-hidden="true" size={16} />
            ) : (
              <Plus aria-hidden="true" size={16} />
            )}
            Add
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => setShowAdd(false)}
            aria-label="Cancel adding a habit"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </form>
      ) : null}

      <div className="card-footer">
        <button
          className="text-button"
          type="button"
          onClick={() => setShowAdd(true)}
          disabled={showAdd}
        >
          <Plus aria-hidden="true" size={16} />
          Add habit
        </button>
        {!expanded ? (
          <Link className="text-link" href="/habits">
            View week
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        ) : null}
      </div>

      <p className="sr-status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
