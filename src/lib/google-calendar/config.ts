import "server-only";

import { getAppOrigin } from "@/lib/config";

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";
export const GOOGLE_CALENDAR_AUTH_SCOPES = [
  GOOGLE_CALENDAR_SCOPE,
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
export const GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS = 6_000;

export type GoogleCalendarConfiguration = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function isValidRedirectUri(value: string) {
  try {
    const url = new URL(value);
    const isLocal =
      process.env.NODE_ENV !== "production" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.protocol === "http:";
    const isSecure = url.protocol === "https:";

    return (
      (isLocal || isSecure) &&
      url.pathname === "/api/google/calendar/callback" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function getGoogleCalendarConfiguration():
  | GoogleCalendarConfiguration
  | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? "";
  const clientSecret =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ?? "";
  const appOrigin = getAppOrigin();

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !appOrigin ||
    !isValidRedirectUri(redirectUri) ||
    new URL(redirectUri).origin !== appOrigin
  ) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}
