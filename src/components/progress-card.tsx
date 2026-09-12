"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeTaskAction } from "@/app/actions/todoist";
import { Flame, Sparkles, Trophy } from "lucide-react";
import { useProgress } from "@/components/progress-provider";
import { DAILY_GOAL_XP, LEVEL_XP } from "@/lib/gamification";

export function ProgressCard() {
  const { result, refresh } = useProgress();
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const [retryMessage, setRetryMessage] = useState("");
  const p = result.progress;
  if (!p)
    return (
      <section className="dashboard-card progress-card" role="status">
        <p>{result.error}</p>
        <button className="text-button" onClick={() => void refresh()}>
          Retry progress
        </button>
      </section>
    );
  const earned = p.badges.filter((badge) => badge.earned).length;
  return (
    <section
      className="dashboard-card progress-card"
      aria-label="Your progress"
    >
      <div className="progress-top">
        <div className="level-emblem" aria-hidden="true">
          <Sparkles size={20} />
          <strong>{p.level}</strong>
        </div>
        <div className="progress-heading">
          <p className="card-kicker">Every small step counts</p>
          <h2>Level {p.level}</h2>
          <p>
            {p.xp.toLocaleString()} XP earned · {LEVEL_XP - p.levelXp} to level{" "}
            {p.level + 1}
          </p>
        </div>
        <span className="streak-pill">
          <Flame size={18} aria-hidden="true" />
          {p.streak.current} day{p.streak.current === 1 ? "" : "s"}
          <small>active streak</small>
        </span>
      </div>
      <progress
        className="xp-meter"
        max={LEVEL_XP}
        value={p.levelXp}
        aria-label={`Level ${p.level} progress`}
      />
      <div className="daily-quest">
        <span>
          <strong>
            {p.todayXp >= DAILY_GOAL_XP
              ? "Daily goal complete!"
              : "Today’s quest"}
          </strong>
          <small>Earn {DAILY_GOAL_XP} XP through tasks and habits</small>
        </span>
        <strong>
          {p.todayXp} / {DAILY_GOAL_XP} XP
        </strong>
      </div>
      <progress
        className="quest-meter"
        max={DAILY_GOAL_XP}
        value={Math.min(p.todayXp, DAILY_GOAL_XP)}
        aria-label="Daily XP goal"
      />
      {(result.pendingTasks?.length ?? 0) > 0 ? (
        <div className="pending-progress">
          <p>
            {result.pendingTasks!.length} task completion(s) still need
            confirmation.
          </p>
          <button
            className="text-button"
            disabled={retrying}
            onClick={() =>
              startRetry(async () => {
                try {
                  for (const task of result.pendingTasks ?? []) {
                    const saved = await completeTaskAction(
                      task.taskId,
                      task.occurrence,
                    );
                    if (!saved.ok) {
                      setRetryMessage(
                        saved.message ??
                          "Could not confirm completion. Try again.",
                      );
                      return;
                    }
                  }
                  setRetryMessage("Task completions confirmed.");
                } catch {
                  setRetryMessage("Could not connect. Try again.");
                } finally {
                  await refresh();
                  router.refresh();
                }
              })
            }
          >
            {retrying ? "Confirming…" : "Retry task completions"}
          </button>
        </div>
      ) : null}
      {retryMessage ? (
        <p role="status" className="progress-rules">
          {retryMessage}
        </p>
      ) : null}
      <details className="milestone-details">
        <summary>
          <Trophy size={16} aria-hidden="true" />
          Milestones{" "}
          <span>
            {earned} / {p.badges.length}
          </span>
        </summary>
        <div className="badge-grid">
          {p.badges.map((badge) => (
            <div
              className="milestone"
              data-earned={badge.earned || undefined}
              key={badge.name}
            >
              <Trophy size={18} aria-hidden="true" />
              <strong>{badge.name}</strong>
              <small>{badge.description}</small>
              <span>{badge.earned ? "Earned" : "Keep going"}</span>
            </div>
          ))}
        </div>
        <p className="progress-rules">
          10 XP per habit check-in · 20 XP per task completed here · 200 XP per
          level. Undoing or deleting a habit removes its XP. A missed day resets
          your streak; your XP stays. Best streak: {p.streak.best} days.
        </p>
      </details>
    </section>
  );
}
