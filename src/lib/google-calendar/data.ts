import "server-only";

import { calendar, type calendar_v3 } from "@googleapis/calendar";

import { getDateKey } from "@/lib/date";
import type { Viewer } from "@/lib/types";
import {
  GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS,
  GOOGLE_CALENDAR_SCOPE,
} from "@/lib/google-calendar/config";
import {
  getGoogleErrorStatus,
  isGoogleApiDisabledError,
  isGooglePermissionError,
} from "@/lib/google-calendar/errors";
import {
  createGoogleOAuthClient,
  isGoogleCalendarReady,
} from "@/lib/google-calendar/oauth";
import {
  decryptGoogleTokenEnvelope,
  encryptGoogleTokenEnvelope,
  tokenEnvelopeEquals,
  type GoogleTokenEnvelope,
} from "@/lib/google-calendar/token-crypto";
import { createClient } from "@/lib/supabase/server";

const AGENDA_DAYS = 7;
const MAX_CALENDARS = 12;
const MAX_EVENTS_PER_CALENDAR = 20;
const MAX_AGENDA_EVENTS = 16;
const AMSTERDAM_TIME_ZONE = "Europe/Amsterdam";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

class GoogleCalendarStorageError extends Error {
  override name = "GoogleCalendarStorageError";
}

type ConnectionRow = {
  user_id: string;
  token_ciphertext: string;
  connected_at: string;
  updated_at: string;
};

export type GoogleCalendarState =
  | "connected"
  | "needs-reconnect"
  | "not-connected"
  | "not-configured"
  | "preview"
  | "unavailable";

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  location?: string;
  url?: string;
  calendarName: string;
  calendarColor?: string;
};

export type GoogleCalendarAgenda = {
  state: GoogleCalendarState;
  events: GoogleCalendarEvent[];
  error: string | null;
  hasMore?: boolean;
  connectedAt?: string;
};

export type GoogleCalendarConnection = {
  state: GoogleCalendarState;
  connectedAt?: string;
};

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getDemoEvents(): GoogleCalendarEvent[] {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const tomorrow = addDays(now, 1);
  tomorrow.setUTCHours(17, 30, 0, 0);

  return [
    {
      id: "demo-calendar-focus",
      title: "Thesis focus block",
      start: inOneHour.toISOString(),
      end: inTwoHours.toISOString(),
      allDay: false,
      calendarName: "Personal",
      calendarColor: "#5f8276",
    },
    {
      id: "demo-calendar-volleyball",
      title: "Volleyball training",
      start: tomorrow.toISOString(),
      allDay: false,
      location: "Sports hall",
      calendarName: "Personal",
      calendarColor: "#a9573f",
    },
  ];
}

async function getConnectionRow(viewer: Viewer) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("user_id,token_ciphertext,connected_at,updated_at")
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (error) {
    throw new GoogleCalendarStorageError(
      "The Google Calendar connection could not be read.",
    );
  }

  return {
    supabase,
    row: data ? (data as ConnectionRow) : null,
  };
}

export async function getGoogleCalendarConnection(
  viewer: Viewer,
): Promise<GoogleCalendarConnection> {
  if (viewer.isDemo) return { state: "preview" };
  if (!isGoogleCalendarReady()) return { state: "not-configured" };

  try {
    const { row } = await getConnectionRow(viewer);
    if (!row) return { state: "not-connected" };

    decryptGoogleTokenEnvelope(row.token_ciphertext, viewer.id);
    return {
      state: "connected",
      connectedAt: row.connected_at,
    };
  } catch (error) {
    return {
      state:
        error instanceof GoogleCalendarStorageError
          ? "unavailable"
          : "needs-reconnect",
    };
  }
}

export async function saveGoogleCalendarConnection(
  viewer: Viewer,
  token: GoogleTokenEnvelope,
) {
  if (viewer.isDemo || !isGoogleCalendarReady()) {
    throw new Error("Google Calendar is not configured.");
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const tokenCiphertext = encryptGoogleTokenEnvelope(token, viewer.id);
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .upsert(
      {
        user_id: viewer.id,
        token_ciphertext: tokenCiphertext,
        scopes: [GOOGLE_CALENDAR_SCOPE],
        connected_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select("user_id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("The Google Calendar connection could not be saved.");
  }
}

export async function deleteGoogleCalendarConnection(viewer: Viewer) {
  if (viewer.isDemo) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("google_calendar_connections")
    .delete()
    .eq("user_id", viewer.id);

  if (error) {
    throw new Error("The Google Calendar connection could not be removed.");
  }
}

export async function getStoredGoogleToken(viewer: Viewer) {
  const { row } = await getConnectionRow(viewer);
  return row
    ? decryptGoogleTokenEnvelope(row.token_ciphertext, viewer.id)
    : null;
}

export function toGoogleTokenEnvelope(
  credentials: {
    refresh_token?: string | null;
    access_token?: string | null;
    expiry_date?: number | null;
    scope?: string | null;
    token_type?: string | null;
  },
  fallbackRefreshToken?: string,
): GoogleTokenEnvelope {
  const refreshToken = credentials.refresh_token ?? fallbackRefreshToken;
  if (!refreshToken) {
    throw new Error("Google did not return an offline refresh token.");
  }

  return {
    refreshToken,
    accessToken: credentials.access_token ?? undefined,
    expiryDate: credentials.expiry_date ?? undefined,
    scope: credentials.scope ?? undefined,
    tokenType: credentials.token_type ?? undefined,
  };
}

async function getAuthorizedCalendarClient(
  viewer: Viewer,
  row: ConnectionRow,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const storedToken = decryptGoogleTokenEnvelope(
    row.token_ciphertext,
    viewer.id,
  );
  const oauth = createGoogleOAuthClient();
  oauth.setCredentials({
    refresh_token: storedToken.refreshToken,
    access_token: storedToken.accessToken,
    expiry_date: storedToken.expiryDate,
    scope: storedToken.scope,
    token_type: storedToken.tokenType,
  });

  await oauth.getAccessToken();
  const currentToken = toGoogleTokenEnvelope(
    oauth.credentials,
    storedToken.refreshToken,
  );

  if (!tokenEnvelopeEquals(storedToken, currentToken)) {
    const { error } = await supabase
      .from("google_calendar_connections")
      .update({
        token_ciphertext: encryptGoogleTokenEnvelope(
          currentToken,
          viewer.id,
        ),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", viewer.id)
      .eq("token_ciphertext", row.token_ciphertext)
      .select("user_id")
      .maybeSingle();

    if (error) {
      throw new Error("Refreshed Google credentials could not be stored.");
    }
  }

  return calendar({ version: "v3", auth: oauth });
}

function getEventStart(event: calendar_v3.Schema$Event) {
  return event.start?.dateTime ?? event.start?.date ?? null;
}

function getEventEnd(event: calendar_v3.Schema$Event) {
  return event.end?.dateTime ?? event.end?.date ?? undefined;
}

function getSafeEventUrl(value: string | null | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "www.google.com" ||
        url.hostname === "calendar.google.com" ||
        url.hostname.endsWith(".calendar.google.com"))
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function getSafeCalendarColor(value: string | null | undefined) {
  return value && HEX_COLOR_PATTERN.test(value) ? value : undefined;
}

function getSortTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function getEventDateKey(event: GoogleCalendarEvent) {
  if (event.allDay) return event.start.slice(0, 10);

  const start = new Date(event.start);
  return Number.isFinite(start.getTime())
    ? getDateKey(start, AMSTERDAM_TIME_ZONE)
    : event.start.slice(0, 10);
}

function compareCalendarEvents(
  first: GoogleCalendarEvent,
  second: GoogleCalendarEvent,
) {
  const dateComparison = getEventDateKey(first).localeCompare(
    getEventDateKey(second),
  );
  if (dateComparison !== 0) return dateComparison;
  if (first.allDay !== second.allDay) return first.allDay ? -1 : 1;
  return getSortTime(first.start) - getSortTime(second.start);
}

function mapCalendarEvents(
  calendar: calendar_v3.Schema$CalendarListEntry,
  events: calendar_v3.Schema$Event[],
) {
  return events.flatMap<GoogleCalendarEvent>((event) => {
    const start = getEventStart(event);
    if (!event.id || !start || event.status === "cancelled") return [];

    return [
      {
        id: `${calendar.id}:${event.id}:${start}`,
        title: event.summary?.trim() || "Untitled event",
        start,
        end: getEventEnd(event),
        allDay: Boolean(event.start?.date && !event.start.dateTime),
        location: event.location?.trim() || undefined,
        url: getSafeEventUrl(event.htmlLink),
        calendarName: calendar.summary?.trim() || "Calendar",
        calendarColor: getSafeCalendarColor(calendar.backgroundColor),
      },
    ];
  });
}

function isAuthenticationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as {
    code?: number | string;
    response?: { status?: number; data?: { error?: string } };
    message?: string;
  };

  return (
    getGoogleErrorStatus(error) === 401 ||
    value.response?.data?.error === "invalid_grant" ||
    value.message?.includes("invalid_grant") === true
  );
}

function getCalendarErrorMessage(error: unknown) {
  if (error instanceof GoogleCalendarStorageError) {
    return "The Calendar connection store is temporarily unavailable.";
  }

  if (isAuthenticationError(error)) {
    return "Google access has expired. Reconnect Calendar in Settings.";
  }

  if (isGoogleApiDisabledError(error)) {
    return "Google Calendar could not be read. Check that the Calendar API is enabled.";
  }

  if (isGooglePermissionError(error)) {
    return "Google Calendar permission is missing. Reconnect Calendar in Settings.";
  }

  return "Google Calendar is temporarily unavailable.";
}

export async function getGoogleCalendarAgenda(
  viewer: Viewer,
): Promise<GoogleCalendarAgenda> {
  if (viewer.isDemo) {
    return {
      state: "preview",
      events: getDemoEvents(),
      error: null,
    };
  }

  if (!isGoogleCalendarReady()) {
    return { state: "not-configured", events: [], error: null };
  }

  try {
    const { row, supabase } = await getConnectionRow(viewer);
    if (!row) {
      return { state: "not-connected", events: [], error: null };
    }

    const calendarApi = await getAuthorizedCalendarClient(
      viewer,
      row,
      supabase,
    );
    const calendarList = await calendarApi.calendarList.list(
      {
        maxResults: 50,
        showHidden: false,
        fields:
          "items(id,summary,primary,selected,hidden,backgroundColor,foregroundColor)",
      },
      {
        retry: false,
        timeout: GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS,
      },
    );
    const availableCalendars = (calendarList.data.items ?? []).filter(
      (calendar) =>
        calendar.id &&
        !calendar.hidden &&
        (calendar.primary || calendar.selected),
    );
    const calendars = availableCalendars.slice(0, MAX_CALENDARS);

    if (calendars.length === 0) {
      calendars.push({
        id: "primary",
        summary: "Primary calendar",
        primary: true,
      });
    }

    const timeMin = new Date();
    const timeMax = addDays(timeMin, AGENDA_DAYS);
    const results = await Promise.allSettled(
      calendars.map(async (calendar) => {
        const response = await calendarApi.events.list(
          {
            calendarId: calendar.id!,
            maxResults: MAX_EVENTS_PER_CALENDAR,
            orderBy: "startTime",
            showDeleted: false,
            singleEvents: true,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            timeZone: AMSTERDAM_TIME_ZONE,
            fields:
              "items(id,iCalUID,summary,start,end,location,htmlLink,status,transparency)",
          },
          {
            retry: false,
            timeout: GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS,
          },
        );

        return mapCalendarEvents(calendar, response.data.items ?? []);
      }),
    );

    const fulfilledCount = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const hasRejectedCalendar = results.some(
      (result) => result.status === "rejected",
    );
    const successful = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    if (fulfilledCount === 0 && hasRejectedCalendar) {
      const firstError = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      throw firstError?.reason;
    }

    const seen = new Set<string>();
    const uniqueEvents = successful
      .sort(compareCalendarEvents)
      .filter((event) => {
        const key = event.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const events = uniqueEvents.slice(0, MAX_AGENDA_EVENTS);

    return {
      state: "connected",
      events,
      hasMore:
        availableCalendars.length > MAX_CALENDARS ||
        uniqueEvents.length > MAX_AGENDA_EVENTS,
      error: hasRejectedCalendar
        ? "Some calendars could not be loaded."
        : null,
      connectedAt: row.connected_at,
    };
  } catch (error) {
    return {
      state:
        error instanceof GoogleCalendarStorageError
          ? "unavailable"
          : isAuthenticationError(error) || isGooglePermissionError(error)
            ? "needs-reconnect"
            : "connected",
      events: [],
      error: getCalendarErrorMessage(error),
    };
  }
}
