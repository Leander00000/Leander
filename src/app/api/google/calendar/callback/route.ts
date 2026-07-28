import { timingSafeEqual } from "node:crypto";
import { calendar } from "@googleapis/calendar";
import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { getOwnerEmail } from "@/lib/config";
import {
  GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS,
  GOOGLE_CALENDAR_SCOPE,
} from "@/lib/google-calendar/config";
import {
  getStoredGoogleToken,
  saveGoogleCalendarConnection,
  toGoogleTokenEnvelope,
} from "@/lib/google-calendar/data";
import {
  isGoogleApiDisabledError,
  isGooglePermissionError,
} from "@/lib/google-calendar/errors";
import {
  createGoogleOAuthClient,
  isGoogleCalendarReady,
} from "@/lib/google-calendar/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "google_calendar_oauth_state";

function hasVerifiedGoogleEmail(tokenInfo: { email_verified?: unknown }) {
  return (
    tokenInfo.email_verified === true ||
    tokenInfo.email_verified === "true"
  );
}

function stateMatches(expected: string | undefined, received: string | null) {
  if (!expected || !received) return false;
  const first = Buffer.from(expected);
  const second = Buffer.from(received);
  return (
    first.length === second.length && timingSafeEqual(first, second)
  );
}

function redirectToSettings(request: NextRequest, status: string) {
  const response = NextResponse.redirect(
    new URL(`/settings?google=${encodeURIComponent(status)}`, request.url),
  );
  response.cookies.set(STATE_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/api/google/calendar",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) {
    return redirectToSettings(request, "session-expired");
  }

  if (viewer.isDemo || !isGoogleCalendarReady()) {
    return redirectToSettings(request, "not-configured");
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!stateMatches(expectedState, state)) {
    return redirectToSettings(request, "invalid-state");
  }

  if (oauthError || !code) {
    return redirectToSettings(request, "access-denied");
  }

  const oauth = createGoogleOAuthClient();
  let newTokenToRevoke: string | undefined;

  try {
    const { tokens } = await oauth.getToken(code);
    newTokenToRevoke =
      tokens.refresh_token ?? tokens.access_token ?? undefined;

    if (!tokens.access_token) {
      throw new Error("Google did not return an access token.");
    }

    const tokenInfo = await oauth.getTokenInfo(tokens.access_token);
    if (!tokenInfo.scopes.includes(GOOGLE_CALENDAR_SCOPE)) {
      if (newTokenToRevoke) {
        await oauth.revokeToken(newTokenToRevoke).catch(() => undefined);
      }
      return redirectToSettings(request, "scope-denied");
    }

    if (
      !hasVerifiedGoogleEmail(tokenInfo) ||
      tokenInfo.email?.trim().toLowerCase() !== getOwnerEmail()
    ) {
      if (newTokenToRevoke) {
        await oauth.revokeToken(newTokenToRevoke).catch(() => undefined);
      }
      return redirectToSettings(request, "owner-mismatch");
    }

    const existing = await getStoredGoogleToken(viewer).catch(() => null);
    const token = toGoogleTokenEnvelope(
      {
        ...tokens,
        scope: tokens.scope ?? tokenInfo.scopes.join(" "),
      },
      existing?.refreshToken,
    );

    oauth.setCredentials({
      ...tokens,
      refresh_token: token.refreshToken,
    });
    const calendarApi = calendar({ version: "v3", auth: oauth });
    await calendarApi.calendarList.list(
      {
        maxResults: 1,
        fields: "items(id)",
      },
      {
        retry: false,
        timeout: GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS,
      },
    );

    await saveGoogleCalendarConnection(viewer, token);
    return redirectToSettings(request, "connected");
  } catch (error) {
    if (newTokenToRevoke) {
      await oauth.revokeToken(newTokenToRevoke).catch(() => undefined);
    }

    if (isGoogleApiDisabledError(error)) {
      return redirectToSettings(request, "api-disabled");
    }

    if (isGooglePermissionError(error)) {
      return redirectToSettings(request, "permission-denied");
    }

    return redirectToSettings(request, "connection-failed");
  }
}
