import { AgendaCard } from "@/components/agenda-card";
import { HabitTracker } from "@/components/habit-tracker";
import { PageHeader } from "@/components/page-header";
import { QuickLinks } from "@/components/quick-links";
import { TodoistCard } from "@/components/todoist-card";
import { requireViewer } from "@/lib/auth";
import { getHabits } from "@/lib/data/habits";
import { getTasks } from "@/lib/data/tasks";
import { formatFullDate, getGreeting } from "@/lib/date";

export default async function TodayPage() {
  const viewer = await requireViewer();
  const [habitsResult, tasksResult] = await Promise.all([
    getHabits(viewer),
    getTasks(),
  ]);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow={formatFullDate()}
        title={`${getGreeting()}, Leander`}
        description="Here is what needs your attention today."
        badge={viewer.isDemo ? "Preview" : undefined}
      />

      <div className="today-grid">
        <div className="today-main-column">
          <TodoistCard
            initialTasks={tasksResult.tasks}
            state={tasksResult.state}
            error={tasksResult.error}
          />
          <HabitTracker
            initialHabits={habitsResult.habits}
            error={habitsResult.error}
          />
        </div>
        <aside className="today-side-column">
          <AgendaCard />
          <QuickLinks />
        </aside>
      </div>
    </div>
  );
}
