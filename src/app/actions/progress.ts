"use server";

import { requireViewer } from "@/lib/auth";
import { getProgress } from "@/lib/data/progress";

export async function refreshProgressAction() {
  return getProgress(await requireViewer());
}
