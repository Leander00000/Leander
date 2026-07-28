import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { getGoogleCalendarConfiguration } from "@/lib/google-calendar/config";
import {
  createGoogleAuthorizationUrl,
  isGoogleCalendarReady,
} from "@/lib/google-calendar/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (isGoogleCalendarReady()) {
    const config = getGoogleCalendarConfiguration()!;
    const requestUrl = new URL(request.url);
    const canonicalOrigin = new URL(config.redirectUri).origin;

    if (requestUrl.origin !== canonicalOrigin) {
      return NextResponse.redirect(
        new URL("/api/google/calendar/connect", canonicalOrigin),
      );
    }
  }

  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (viewer.isDemo || !isGoogleCalendarReady()) {
    return NextResponse.redirect(
      new URL("/settings?google=not-configured", request.url),
    );
  }

  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(createGoogleAuthorizationUrl(state));
  response.cookies.set("google_calendar_oauth_state", state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/google/calendar",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
