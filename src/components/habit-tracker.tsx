"use client";

import {
  Check,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react";

import {
  createHabitAction,
  deleteHabitAction,
  toggleHabitAction,
  updateHabitAction,
} from "@/app/actions/habits";
import { getWeekDates } from "@/lib/date";
import {
  DEFAULT_HABIT_CATEGORY,
  DEFAULT_HABIT_ICON,
  HABIT_CATEGORIES,
  HABIT_ICONS,
} from "@/lib/habit-options";
import type { HabitView } from "@/lib/types";

type HabitTrackerProps = {
  initialHabits: HabitView[];
  error?: string | null;
  expanded?: boolean;
};

type HabitFormProps = {
  habit?: HabitView;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
};

const COLORS = ["#5f8f88", "#80975b", "#b87964", "#9b7b45", "#7c719d"];

function HabitIdentity({
  habit,
  showProgress,
}: {
  habit: HabitView;
  showProgress: boolean;
}) {
  const completedCount = habit.week.filter((day) => day.completed).length;

  return (
    <div className="habit-name">
      <span
        className="habit-icon"
        style={{ "--habit-color": habit.color } as CSSProperties}
        aria-hidden="true"
      >
        {habit.icon}
      </span>
      <span>
        <strong>{habit.name}</strong>
        <small className="habit-details">
          <span className="habit-category">{habit.category}</span>
          {showProgress ? (
            <span>{Math.round((completedCount / 7) * 100)}% last 7 days</span>
          ) : null}
        </small>
      </span>
    </div>
  );
}

function HabitDetailsForm({
  habit,
  isSaving,
  onCancel,
  onSubmit,
}: HabitFormProps) {
  const mode = habit ? "edit" : "add";
  const selectedIcon = habit?.icon ?? DEFAULT_HABIT_ICON;
  const selectedCategory = habit?.category ?? DEFAULT_HABIT_CATEGORY;
  const selectedColor = habit?.color ?? COLORS[0];

  return (
    <form
      action={onSubmit}
      className="habit-details-form"
      aria-label={habit ? `Edit ${habit.name}` : "Add a habit"}
    >
      <div className="habit-form-heading">
        <div>
          <p className="card-kicker">{habit ? "Edit habit" : "New habit"}</p>
          <h3>{habit ? habit.name : "Create a habit"}</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onCancel}
          aria-label="Close habit form"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <div className="habit-form-fields">
        <div className="form-field grow-field">
          <label htmlFor={`${mode}-habit-name`}>Habit name</label>
          <input
            id={`${mode}-habit-name`}
            name="name"
            defaultValue={habit?.name}
            placeholder="e.g. Stretch for five minutes"
            maxLength={80}
            autoFocus
            required
          />
        </div>

        <div className="form-field category-field">
          <label htmlFor={`${mode}-habit-category`}>Category</label>
          <select
            id={`${mode}-habit-category`}
            name="category"
            defaultValue={selectedCategory}
          >
            {HABIT_CATEGORIES.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="icon-picker-field">
        <legend>Icon</legend>
        <div>
          {HABIT_ICONS.map((icon) => (
            <label className="icon-choice" key={icon}>
              <input
                type="radio"
                name="icon"
                value={icon}
                defaultChecked={icon === selectedIcon}
              />
              <span aria-label={`Use ${icon} as icon`}>{icon}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="color-field">
        <legend>Colour</legend>
        <div>
          {COLORS.map((color) => (
            <label className="color-choice" key={color}>
              <input
                type="radio"
                name="color"
                value={color}
                defaultChecked={color === selectedColor}
              />
              <span
                style={{ "--choice-color": color } as CSSProperties}
                aria-label={color}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="habit-form-actions">
        <button
          className="button button-primary button-small"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? (
            <LoaderCircle className="spin" aria-hidden="true" size={16} />
          ) : habit ? (
            <Check aria-hidden="true" size={16} />
          ) : (
            <Plus aria-hidden="true" size={16} />
          )}
          {habit ? "Save changes" : "Add habit"}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function HabitTracker({
  initialHabits,
  error,
  expanded = false,
}: HabitTrackerProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [showAdd, setShowAdd] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [pendingCheckins, setPendingCheckins] = useState<Set<string>>(
    () => new Set(),
  );
  const [status, setStatus] = useState<string | null>(error ?? null);
  const [, startCheckinTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();

  const todayCompleted = useMemo(
    () =>
      habits.filter(
        (habit) => habit.week.find((day) => day.isToday)?.completed,
      ).length,
    [habits],
  );

  const usedCategories = useMemo(
    () =>
      HABIT_CATEGORIES.filter((category) =>
        habits.some((habit) => habit.category === category),
      ),
    [habits],
  );

  const effectiveCategory =
    activeCategory === "All" ||
    usedCategories.some((category) => category === activeCategory)
      ? activeCategory
      : "All";

  const visibleHabits =
    effectiveCategory === "All"
      ? habits
      : habits.filter((habit) => habit.category === effectiveCategory);

  const editingHabit =
    habits.find((habit) => habit.id === editingHabitId) ?? null;

  function updateCheckin(
    habitId: string,
    date: string,
    completed: boolean,
  ) {
    setHabits((current) =>
      current.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              week: habit.week.map((day) =>
                day.key === date ? { ...day, completed } : day,
              ),
            }
          : habit,
      ),
    );
  }

  function markCheckinPending(key: string, pending: boolean) {
    setPendingCheckins((current) => {
      const next = new Set(current);
      if (pending) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleHabit(habitId: string, date: string) {
    const habit = habits.find((item) => item.id === habitId);
    const day = habit?.week.find((item) => item.key === date);
    const pendingKey = `${habitId}:${date}`;

    if (
      !habit ||
      !day ||
      pendingCheckins.has(pendingKey) ||
      (!expanded && !day.isToday)
    ) {
      return;
    }

    const nextCompleted = !day.completed;
    setStatus(null);
    markCheckinPending(pendingKey, true);
    updateCheckin(habitId, date, nextCompleted);

    startCheckinTransition(async () => {
      const result = await toggleHabitAction({
        habitId,
        date,
        completed: nextCompleted,
      });

      if (!result.ok) {
        updateCheckin(habitId, date, day.completed);
        setStatus(result.message ?? "That check-in was not saved.");
      } else {
        setStatus(nextCompleted ? "Check-in saved." : "Check-in removed.");
      }

      markCheckinPending(pendingKey, false);
    });
  }

  function addHabit(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const icon = String(formData.get("icon") ?? DEFAULT_HABIT_ICON);
    const color = String(formData.get("color") ?? COLORS[0]);
    const category = String(
      formData.get("category") ?? DEFAULT_HABIT_CATEGORY,
    );
    setStatus(null);

    startSavingTransition(async () => {
      const result = await createHabitAction({
        name,
        icon,
        color,
        category,
      });

      if (!result.ok || !result.habit) {
        setStatus(result.message ?? "The habit could not be added.");
        return;
      }

      const habit = result.habit;
      setHabits((current) => [
        ...current,
        {
          ...habit,
          sortOrder: current.length,
          week: getWeekDates().map((day) => ({ ...day, completed: false })),
        },
      ]);
      setShowAdd(false);
      setStatus("Habit added.");
    });
  }

  function saveHabit(formData: FormData) {
    if (!editingHabit) return;

    const name = String(formData.get("name") ?? "");
    const icon = String(formData.get("icon") ?? DEFAULT_HABIT_ICON);
    const color = String(formData.get("color") ?? COLORS[0]);
    const category = String(
      formData.get("category") ?? DEFAULT_HABIT_CATEGORY,
    );
    setStatus(null);

    startSavingTransition(async () => {
      const result = await updateHabitAction({
        habitId: editingHabit.id,
        name,
        icon,
        color,
        category,
      });

      if (!result.ok || !result.habit) {
        setStatus(result.message ?? "The habit could not be updated.");
        return;
      }

      const updated = result.habit;
      setHabits((current) =>
        current.map((habit) =>
          habit.id === updated.id ? { ...habit, ...updated } : habit,
        ),
      );
      setEditingHabitId(null);
      setStatus("Habit updated.");
    });
  }

  function deleteHabit(habitId: string) {
    const previous = habits;
    setStatus(null);
    setHabits((current) => current.filter((habit) => habit.id !== habitId));
    setEditingHabitId((current) => (current === habitId ? null : current));
    setConfirmDeleteId(null);

    startSavingTransition(async () => {
      const result = await deleteHabitAction(habitId);
      if (!result.ok) {
        setHabits(previous);
        setStatus(result.message ?? "The habit could not be deleted.");
      } else {
        setStatus("Habit and its check-ins deleted.");
      }
    });
  }

  function startEditing(habitId: string) {
    setEditingHabitId(habitId);
    setConfirmDeleteId(null);
    setShowAdd(false);
    setStatus(null);
  }

  return (
    <section
      className="dashboard-card habit-card"
      data-expanded={expanded || undefined}
    >
      <div className="card-heading">
        <div>
          <p className="card-kicker">
            {expanded ? "Last 7 days" : "Daily rhythm"}
          </p>
          <h2>{expanded ? "Habit history" : "Today’s habits"}</h2>
        </div>
        <span className="completion-summary">
          <strong>{todayCompleted}</strong>
          <span aria-hidden="true">/</span>
          <span>{habits.length}</span>
          <small>today</small>
        </span>
      </div>

      {expanded && habits.length > 0 ? (
        <>
          <p className="card-helper">
            Tap any day to add or remove a check-in.
          </p>
          {usedCategories.length > 1 ? (
            <div
              className="habit-category-filter"
              aria-label="Filter habits by category"
            >
              {["All", ...usedCategories].map((category) => (
                <button
                  type="button"
                  key={category}
                  data-selected={effectiveCategory === category || undefined}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {error ? (
        <div className="inline-alert" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {visibleHabits.length > 0 && !expanded ? (
        <div className="habit-today-list">
          {visibleHabits.map((habit) => {
            const today = habit.week.find((day) => day.isToday);
            if (!today) return null;

            const pendingKey = `${habit.id}:${today.key}`;
            const isPending = pendingCheckins.has(pendingKey);

            return (
              <div className="habit-today-row" key={habit.id}>
                <HabitIdentity habit={habit} showProgress={false} />
                <button
                  className="habit-today-toggle"
                  type="button"
                  data-completed={today.completed || undefined}
                  disabled={isPending}
                  onClick={() => toggleHabit(habit.id, today.key)}
                  aria-pressed={today.completed}
                >
                  {isPending ? (
                    <LoaderCircle
                      className="spin"
                      aria-hidden="true"
                      size={16}
                    />
                  ) : (
                    <Check aria-hidden="true" size={16} />
                  )}
                  {today.completed ? "Done today" : "Mark done"}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {visibleHabits.length > 0 && expanded ? (
        <div className="habit-table">
          <div className="habit-table-head" aria-hidden="true">
            <span />
            <div className="habit-week habit-week-head">
              {visibleHabits[0].week.map((day) => (
                <span className={day.isToday ? "is-today" : ""} key={day.key}>
                  {day.day}
                </span>
              ))}
            </div>
            <span />
          </div>

          {visibleHabits.map((habit) => (
            <div className="habit-row" key={habit.id}>
              <HabitIdentity habit={habit} showProgress />

              <div className="habit-week">
                {habit.week.map((day) => {
                  const pendingKey = `${habit.id}:${day.key}`;
                  const isPending = pendingCheckins.has(pendingKey);

                  return (
                    <button
                      className="habit-check"
                      data-completed={day.completed || undefined}
                      data-today={day.isToday || undefined}
                      type="button"
                      key={day.key}
                      onClick={() => toggleHabit(habit.id, day.key)}
                      disabled={isPending}
                      aria-pressed={day.completed}
                      aria-label={`${day.completed ? "Remove" : "Add"} ${
                        habit.name
                      } check-in for ${day.dayLong}`}
                    >
                      {isPending ? (
                        <LoaderCircle
                          className="spin"
                          aria-hidden="true"
                          size={15}
                        />
                      ) : day.completed ? (
                        <Check
                          aria-hidden="true"
                          size={15}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <span aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="habit-actions">
                {confirmDeleteId === habit.id ? (
                  <>
                    <button
                      className="button button-danger button-small"
                      type="button"
                      onClick={() => deleteHabit(habit.id)}
                      disabled={isSaving}
                    >
                      Delete
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={isSaving}
                      aria-label={`Cancel deleting ${habit.name}`}
                    >
                      <X aria-hidden="true" size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => startEditing(habit.id)}
                      disabled={isSaving}
                      aria-label={`Edit ${habit.name}`}
                      title="Edit habit"
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </button>
                    <button
                      className="icon-button delete-button"
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(habit.id);
                        setEditingHabitId(null);
                      }}
                      disabled={isSaving}
                      aria-label={`Delete ${habit.name}`}
                      title="Delete habit"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {habits.length === 0 ? (
        <div className="empty-state compact-empty">
          <span className="empty-symbol" aria-hidden="true">
            ○
          </span>
          <div>
            <h3>Start with one repeatable habit.</h3>
            <p>Small enough to check off on an ordinary day.</p>
          </div>
        </div>
      ) : visibleHabits.length === 0 ? (
        <div className="empty-state compact-empty">
          <span className="empty-symbol" aria-hidden="true">
            ○
          </span>
          <div>
            <h3>No habits in this category.</h3>
            <p>Choose another category to see your habits.</p>
          </div>
        </div>
      ) : null}

      {showAdd ? (
        <HabitDetailsForm
          isSaving={isSaving}
          onSubmit={addHabit}
          onCancel={() => setShowAdd(false)}
        />
      ) : null}

      {editingHabit ? (
        <HabitDetailsForm
          key={editingHabit.id}
          habit={editingHabit}
          isSaving={isSaving}
          onSubmit={saveHabit}
          onCancel={() => setEditingHabitId(null)}
        />
      ) : null}

      {status && !error ? (
        <p className="habit-status" aria-live="polite">
          {status}
        </p>
      ) : null}

      <div className="card-footer">
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setShowAdd(true);
            setEditingHabitId(null);
            setConfirmDeleteId(null);
            setStatus(null);
          }}
          disabled={showAdd || isSaving}
        >
          <Plus aria-hidden="true" size={16} />
          Add habit
        </button>
        {!expanded ? (
          <Link className="text-link" href="/habits">
            Manage &amp; view history
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
