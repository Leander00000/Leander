import {
  CalendarDays,
  CheckCircle2,
  Database,
  ExternalLink,
  LockKeyhole,
  RefreshCw,
  Unplug,
} from "lucide-react";
import type { Metadata } from "next";

import { signOutAction } from "@/app/actions/auth";
import { disconnectGoogleCalendarAction } from "@/app/actions/google-calendar";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/auth";
import {
  getGoogleCalendarConnection,
  type GoogleCalendarConnection,
} from "@/lib/google-calendar/data";

export const metadata: Metadata = {
  title: "Settings",
};

type SettingsPageProps = {
  searchParams: Promise<{
    google?: string | string[];
  }>;
};

const GOOGLE_FEEDBACK = {
  connected: {
    tone: "success",
    message: "Google Calendar is connected. Your agenda is ready.",
  },
  disconnected: {
    tone: "neutral",
    message: "Google Calendar was disconnected and its saved token was removed.",
  },
  "disconnect-failed": {
    tone: "error",
    message:
      "Google could not confirm token revocation, so the saved connection was kept. Try disconnecting again.",
  },
  "not-configured": {
    tone: "error",
    message:
      "Google OAuth is not configured for this deployment yet. Add the required credentials before connecting.",
  },
  "invalid-state": {
    tone: "error",
    message:
      "The secure Google sign-in check expired or did not match. Please try connecting again.",
  },
  "access-denied": {
    tone: "neutral",
    message: "Google Calendar access was not granted. Nothing was connected.",
  },
  "scope-denied": {
    tone: "error",
    message:
      "Google did not grant read-only Calendar access. Reconnect and approve the requested permission.",
  },
  "owner-mismatch": {
    tone: "error",
    message:
      "That is not the dashboard owner Google account. Choose the same account used to sign in.",
  },
  "permission-denied": {
    tone: "error",
    message:
      "This Google account does not have permission to read its calendar. Check the account and try again.",
  },
  "api-disabled": {
    tone: "error",
    message:
      "The Google Calendar API is not available for this OAuth project. Enable it in Google Cloud and try again.",
  },
  "connection-failed": {
    tone: "error",
    message:
      "Google Calendar could not be connected. Check the OAuth settings and try again.",
  },
  "session-expired": {
    tone: "error",
    message: "Your dashboard session expired. Sign in, then connect again.",
  },
} as const;

function getConnectionDescription(connection: GoogleCalendarConnection) {
  switch (connection.state) {
    case "connected":
      return connection.connectedAt
        ? `Read-only access · connected ${new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeZone: "Europe/Amsterdam",
          }).format(new Date(connection.connectedAt))}`
        : "Private read-only access to your upcoming events";
    case "needs-reconnect":
      return "The saved authorization is no longer valid";
    case "not-connected":
      return "Connect directly with private, read-only access";
    case "not-configured":
      return "Google OAuth credentials are still missing";
    case "preview":
      return "Sample events are shown in dashboard preview";
    case "unavailable":
      return "The private connection store could not be reached";
  }
}

function getConnectionLabel(connection: GoogleCalendarConnection) {
  switch (connection.state) {
    case "connected":
      return "Connected";
    case "needs-reconnect":
      return "Reconnect";
    case "not-connected":
      return "Not connected";
    case "not-configured":
      return "Setup needed";
    case "preview":
      return "Preview";
    case "unavailable":
      return "Unavailable";
  }
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const viewer = await requireViewer();
  const [calendarConnection, query] = await Promise.all([
    getGoogleCalendarConnection(viewer),
    searchParams,
  ]);
  const todoistConnected =
    viewer.isDemo || Boolean(process.env.TODOIST_API_TOKEN?.trim());
  const googleStatus = Array.isArray(query.google)
    ? query.google[0]
    : query.google;
  const feedback =
    googleStatus && googleStatus in GOOGLE_FEEDBACK
      ? GOOGLE_FEEDBACK[googleStatus as keyof typeof GOOGLE_FEEDBACK]
      : null;
  const googleNeedsAttention =
    calendarConnection.state === "needs-reconnect" ||
    calendarConnection.state === "not-configured" ||
    calendarConnection.state === "unavailable";

  return (
    <div className="page-wrap narrow-page">
      <PageHeader
        eyebrow="Private by design"
        title="Settings"
        description="See what is connected without exposing private keys."
        badge={viewer.isDemo ? "Preview" : undefined}
      />

      <div className="settings-stack">
        {feedback ? (
          <div
            className="settings-feedback"
            data-tone={feedback.tone}
            role={feedback.tone === "error" ? "alert" : "status"}
          >
            <span>{feedback.message}</span>
            <a href="/settings" aria-label="Dismiss Google Calendar message">
              Dismiss
            </a>
          </div>
        ) : null}

        <section className="dashboard-card settings-card">
          <div className="card-heading">
            <div>
              <p className="card-kicker">Connections</p>
              <h2>Integrations</h2>
            </div>
          </div>

          <div className="settings-list">
            <div className="setting-row">
              <span className="setting-icon" aria-hidden="true">
                <CheckCircle2 size={19} />
              </span>
              <span className="setting-copy">
                <strong>Todoist</strong>
                <small>Today, overdue, quick add, and complete</small>
              </span>
              <span className="status-pill">
                {todoistConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            <div className="setting-row">
              <span className="setting-icon" aria-hidden="true">
                <Database size={19} />
              </span>
              <span className="setting-copy">
                <strong>Supabase</strong>
                <small>Private habits and browser session</small>
              </span>
              <span className="status-pill">
                {viewer.isDemo ? "Preview" : "Connected"}
              </span>
            </div>
            <div className="setting-row">
              <span className="setting-icon" aria-hidden="true">
                <CalendarDays size={19} />
              </span>
              <span className="setting-copy">
                <strong>Google Calendar</strong>
                <small>{getConnectionDescription(calendarConnection)}</small>
              </span>
              <div className="integration-controls">
                <span
                  className={`status-pill ${
                    googleNeedsAttention
                      ? "status-invalid"
                      : calendarConnection.state === "not-connected"
                        ? "status-planned"
                        : ""
                  }`}
                >
                  {getConnectionLabel(calendarConnection)}
                </span>

                {calendarConnection.state === "connected" ? (
                  <div className="integration-actions">
                    <a
                      className="text-link"
                      href="/api/google/calendar/connect"
                    >
                      <RefreshCw aria-hidden="true" size={14} />
                      Reconnect
                    </a>
                    <form action={disconnectGoogleCalendarAction}>
                      <button
                        className="text-button danger-text"
                        type="submit"
                      >
                        <Unplug aria-hidden="true" size={14} />
                        Disconnect
                      </button>
                    </form>
                  </div>
                ) : calendarConnection.state === "not-connected" ||
                  calendarConnection.state === "needs-reconnect" ? (
                  <a
                    className="button button-primary button-small"
                    href="/api/google/calendar/connect"
                  >
                    <CalendarDays aria-hidden="true" size={15} />
                    {calendarConnection.state === "needs-reconnect"
                      ? "Reconnect"
                      : "Connect"}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-card settings-card">
          <div className="card-heading">
            <div>
              <p className="card-kicker">Owner</p>
              <h2>Access</h2>
            </div>
          </div>
          <div className="account-settings-row">
            <span className="avatar" aria-hidden="true">
              L
            </span>
            <span>
              <strong>{viewer.name}</strong>
              <small>{viewer.email}</small>
            </span>
          </div>

          <div className="card-footer">
            {viewer.isDemo ? (
              <span className="muted-copy">Sign-out is disabled in preview.</span>
            ) : (
              <form action={signOutAction}>
                <button className="text-button danger-text" type="submit">
                  <LockKeyhole aria-hidden="true" size={16} />
                  Lock dashboard
                </button>
              </form>
            )}
            <a
              className="text-link"
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              Supabase
              <ExternalLink aria-hidden="true" size={14} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
