import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateProgress,
  streakForDates,
  previousDay,
} from "../src/lib/gamification.ts";
import {
  issueDeviceToken,
  verifyDeviceToken,
  DEVICE_MAX_AGE,
} from "../src/lib/device-token.ts";

const today = "2026-09-12";
const habit = (date, id = "h1") => ({
  id: `habit:${id}:${date}`,
  habitId: id,
  kind: "habit",
  date,
});
const task = (id, date = today) => ({ id: `task:${id}`, kind: "task", date });

test("starts at level one; awards 10/20 XP; duplicate activities count once", () => {
  assert.equal(calculateProgress([], today).level, 1);
  const p = calculateProgress([habit(today), habit(today), task("a")], today);
  assert.equal(p.xp, 30);
  assert.equal(p.todayXp, 30);
  assert.equal(p.checkins, 1);
});
test("level thresholds, daily goal, and future entries", () => {
  const p = calculateProgress(
    Array.from({ length: 10 }, (_, i) => task(String(i))).concat(
      habit("2026-09-13"),
    ),
    today,
  );
  assert.equal(p.xp, 200);
  assert.equal(p.level, 2);
  assert.equal(p.levelXp, 0);
});
test("undo and deletion remove XP instead of allowing repeated rewards", () => {
  const saved = [habit(today), habit("2026-09-11"), task("a")];
  assert.equal(calculateProgress(saved, today).xp, 40);
  assert.equal(
    calculateProgress(
      saved.filter((item) => item.id !== habit(today).id),
      today,
    ).xp,
    30,
  );
  assert.equal(
    calculateProgress(
      saved.filter((item) => item.habitId !== "h1"),
      today,
    ).xp,
    20,
  );
});
test("a streak remains available until the end of today and breaks on a missed full day", () => {
  assert.deepEqual(streakForDates(["2026-09-10", "2026-09-11"], today), {
    current: 2,
    best: 2,
  });
  assert.deepEqual(streakForDates(["2026-09-09", "2026-09-10"], today), {
    current: 0,
    best: 2,
  });
});
test("habit streaks are independent; active streak includes either activity", () => {
  const p = calculateProgress(
    [habit("2026-09-10"), task("a", "2026-09-11"), habit(today)],
    today,
  );
  assert.equal(p.streak.current, 3);
  assert.equal(p.habitStreaks.h1.current, 1);
  assert.equal(
    p.badges.find((badge) => badge.name === "Finding rhythm").earned,
    true,
  );
});
test("calendar stepping handles months, leap days, and DST dates", () => {
  assert.equal(previousDay("2024-03-01"), "2024-02-29");
  assert.equal(previousDay("2026-01-01"), "2025-12-31");
  assert.equal(
    streakForDates(["2026-03-28", "2026-03-29", "2026-03-30"], "2026-03-30")
      .current,
    3,
  );
});
test("device tokens accept only the owner, valid signature and unexpired session", () => {
  const secret = "test-only-secret-key";
  const now = Date.parse("2026-09-12T12:00:00Z");
  const token = issueDeviceToken(secret, "owner-a", now);
  assert.equal(verifyDeviceToken(token, secret, "owner-a", now), true);
  assert.equal(verifyDeviceToken(token, secret, "owner-b", now), false);
  assert.equal(
    verifyDeviceToken(token, "rotated-secret", "owner-a", now),
    false,
  );
  assert.equal(verifyDeviceToken(token + "x", secret, "owner-a", now), false);
  assert.equal(
    verifyDeviceToken(token, secret, "owner-a", now + DEVICE_MAX_AGE * 1000),
    false,
  );
  assert.equal(verifyDeviceToken(undefined, secret, "owner-a", now), false);
  assert.equal(
    verifyDeviceToken("owner-a.NaN.x.x", secret, "owner-a", now),
    false,
  );
});
