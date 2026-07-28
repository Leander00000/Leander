export type Viewer = {
  id: string;
  email: string;
  name: string;
  isDemo: boolean;
};

export type WeekDay = {
  key: string;
  day: string;
  dayLong: string;
  isToday: boolean;
};

export type HabitView = {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  week: Array<WeekDay & { completed: boolean }>;
};

export type DashboardTask = {
  id: string;
  content: string;
  description?: string;
  priority: number;
  project?: string;
  dueLabel?: string;
  overdue: boolean;
  url?: string;
};

export type IntegrationState = "connected" | "preview" | "not-connected";

