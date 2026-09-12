"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { refreshProgressAction } from "@/app/actions/progress";
import { getDateKey } from "@/lib/date";
import {
  calculateProgress,
  type Activity,
  type ProgressResult,
} from "@/lib/gamification";

type Change = { activity?: Activity; removeId?: string; removeHabit?: string };
const Context = createContext<{
  result: ProgressResult;
  refresh: (change?: Change) => Promise<void>;
} | null>(null);

export function ProgressProvider({
  initial,
  isDemo,
  children,
}: {
  initial: ProgressResult;
  isDemo: boolean;
  children: ReactNode;
}) {
  const [result, setResult] = useState(initial);
  const demoActivities = useRef(initial.activities ?? []);
  const request = useRef(0);
  const refresh = useCallback(
    async (change?: Change) => {
      if (isDemo) {
        let activities = demoActivities.current.filter(
          (item) =>
            item.id !== change?.removeId &&
            (!change?.removeHabit || item.habitId !== change.removeHabit),
        );
        if (change?.activity)
          activities = [
            ...activities.filter((item) => item.id !== change.activity!.id),
            change.activity,
          ];
        demoActivities.current = activities;
        setResult({
          progress: calculateProgress(activities, getDateKey()),
          error: null,
        });
        return;
      }
      const id = ++request.current;
      try {
        const next = await refreshProgressAction();
        if (id === request.current) setResult(next);
      } catch {
        if (id === request.current)
          setResult({
            progress: null,
            error: "Could not refresh progress. Try again.",
          });
      }
    },
    [isDemo],
  );

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return (
    <Context.Provider value={{ result, refresh }}>{children}</Context.Provider>
  );
}

export function useProgress() {
  const context = useContext(Context);
  if (!context) throw new Error("ProgressProvider is required.");
  return context;
}
