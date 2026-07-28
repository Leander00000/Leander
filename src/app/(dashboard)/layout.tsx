import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireViewer } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await requireViewer();

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
