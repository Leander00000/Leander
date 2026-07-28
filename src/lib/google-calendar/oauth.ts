import "server-only";

import { OAuth2Client } from "google-auth-library";

import { getOwnerEmail } from "@/lib/config";
import {
  GOOGLE_CALENDAR_AUTH_SCOPES,
  GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS,
  getGoogleCalendarConfiguration,
} from "@/lib/google-calendar/config";
import { hasGoogleTokenEncryptionKey } from "@/lib/google-calendar/token-crypto";

export function isGoogleCalendarReady() {
  return Boolean(
    getGoogleCalendarConfiguration() && hasGoogleTokenEncryptionKey(),
  );
}

export function createGoogleOAuthClient() {
  const config = getGoogleCalendarConfiguration();
  if (!config || !hasGoogleTokenEncryptionKey()) {
    throw new Error("Google Calendar is not configured.");
  }

  return new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    transporterOptions: {
      retry: false,
      retryConfig: { retry: 0 },
      timeout: GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS,
    },
  });
}

export function createGoogleAuthorizationUrl(state: string) {
  const oauth = createGoogleOAuthClient();

  return oauth.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: false,
    login_hint: getOwnerEmail(),
    prompt: "consent",
    scope: [...GOOGLE_CALENDAR_AUTH_SCOPES],
    state,
  });
}

export async function revokeGoogleToken(token: string) {
  const oauth = new OAuth2Client({
    transporterOptions: {
      retry: false,
      retryConfig: { retry: 0 },
      timeout: GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS,
    },
  });
  await oauth.revokeToken(token);
}
