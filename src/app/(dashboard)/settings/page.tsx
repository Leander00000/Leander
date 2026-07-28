import {
  CalendarDays,
  CheckCircle2,
  Database,
  ExternalLink,
  LogOut,
} from "lucide-react";
import type { Metadata } from "next";

import { signOutAction } from "@/app/actions/auth";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const todoistConnected =
    viewer.isDemo || Boolean(process.env.TODOIST_API_TOKEN?.trim());

  return (
    <div className="page-wrap narrow-page">
      <PageHeader
        eyebrow="Private by design"
        title="Settings"
        description="See what is connected without exposing private keys."
        badge={viewer.isDemo ? "Preview" : undefined}
      />

      <div className="settings-stack">
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
                <small>Private habits and account access</small>
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
                <small>Direct link in V1; event sync can follow</small>
              </span>
              <span className="status-pill status-planned">Planned</span>
            </div>
          </div>
        </section>

        <section className="dashboard-card settings-card">
          <div className="card-heading">
            <div>
              <p className="card-kicker">Owner</p>
              <h2>Account</h2>
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
                  <LogOut aria-hidden="true" size={16} />
                  Sign out
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
