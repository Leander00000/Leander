import type { Metadata } from "next";

import { HabitTracker } from "@/components/habit-tracker";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/auth";
import { getHabits } from "@/lib/data/habits";

export const metadata: Metadata = {
  title: "Habits",
};

export default async function HabitsPage() {
  const viewer = await requireViewer();
  const result = await getHabits(viewer);

  return (
    <div className="page-wrap narrow-page">
      <PageHeader
        eyebrow="Your current week"
        title="Habits"
        description="Check in, look back, and keep the list deliberately small."
      />
      <HabitTracker
        initialHabits={result.habits}
        error={result.error}
        expanded
      />
    </div>
  );
}
