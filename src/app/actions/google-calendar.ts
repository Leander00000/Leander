"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/auth";
import {
  deleteGoogleCalendarConnection,
  getStoredGoogleToken,
} from "@/lib/google-calendar/data";
import { getGoogleErrorStatus } from "@/lib/google-calendar/errors";
import { revokeGoogleToken } from "@/lib/google-calendar/oauth";

export async function disconnectGoogleCalendarAction() {
  const viewer = await requireViewer();

  if (!viewer.isDemo) {
    let token: Awaited<ReturnType<typeof getStoredGoogleToken>>;
    try {
      token = await getStoredGoogleToken(viewer);
    } catch {
      redirect("/settings?google=disconnect-failed");
    }

    if (token) {
      try {
        await revokeGoogleToken(token.refreshToken);
      } catch (error) {
        if (getGoogleErrorStatus(error) !== 400) {
          redirect("/settings?google=disconnect-failed");
        }
      }
    }

    await deleteGoogleCalendarConnection(viewer);
  }

  revalidatePath("/");
  revalidatePath("/settings");
  redirect("/settings?google=disconnected");
}
