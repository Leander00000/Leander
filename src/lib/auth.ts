import "server-only";

import { redirect } from "next/navigation";

import { getAppMode, getOwnerEmail } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email.trim().toLowerCase()
      : "";
  const id = typeof data.claims.sub === "string" ? data.claims.sub : "";

  if (!id || email !== getOwnerEmail()) {
    return null;
  }

  return {
    id,
    email,
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

