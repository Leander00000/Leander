import type { ReactNode } from "react";

import { ProgressProvider } from "@/components/progress-provider";
import { getProgress } from "@/lib/data/progress";
import { AppShell } from "@/components/app-shell";
import { requireViewer } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await requireViewer();

  const progress = await getProgress(viewer);
  return (
    <AppShell viewer={viewer}>
      <ProgressProvider initial={progress} isDemo={viewer.isDemo}>
        {children}
      </ProgressProvider>
    </AppShell>
  );
}
