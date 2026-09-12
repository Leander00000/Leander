import "server-only";

import { redirect } from "next/navigation";

import { getAppMode } from "@/lib/config";
import { getDeviceAccessConfig, hasDeviceAccess } from "@/lib/device-access";
import type { Viewer } from "@/lib/types";

const DEMO_VIEWER: Viewer = {
  id: "demo-user",
  email: "preview@leander.local",
  name: "Leander",
  isDemo: true,
};

export async function getViewer(): Promise<Viewer | null> {
  const mode = getAppMode();

  if (mode === "demo") {
    return DEMO_VIEWER;
  }

  if (mode === "unconfigured") {
    return null;
  }

  const access = getDeviceAccessConfig();
  if (!access || !(await hasDeviceAccess())) return null;
  const id = access.owner;

  return {
    id,
    email: "Remembered device",
    name: "Leander",
    isDemo: false,
  };
}

export async function requireViewer() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login");
  }

  return viewer;
}
