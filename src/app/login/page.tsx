import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { getAppMode, getAppOrigin } from "@/lib/config";

type LoginPageProps = {
  searchParams: Promise<{
    auth?: string | string[];
  }>;
};

const AUTH_FEEDBACK = {
  "access-denied": "Google sign-in was cancelled. Nothing was changed.",
  "callback-failed": "The secure sign-in exchange failed. Please try again.",
  "not-owner": "That Google account is not allowed to open this dashboard.",
  "not-configured":
    "Google sign-in is not configured for this deployment yet.",
  "provider-failed":
    "Google sign-in could not be started. Check the Supabase provider settings.",
} as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const mode = getAppMode();
  const query = await searchParams;
  const authStatus = Array.isArray(query.auth) ? query.auth[0] : query.auth;
  const feedback =
    authStatus && authStatus in AUTH_FEEDBACK
      ? AUTH_FEEDBACK[authStatus as keyof typeof AUTH_FEEDBACK]
      : null;
  const googleAuthConfigured = Boolean(getAppOrigin());

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>Leander</span>
        </Link>

        <div className="auth-copy">
          <span className="auth-icon">
            <LockKeyhole aria-hidden="true" size={22} />
          </span>
          <p className="kicker">Private dashboard</p>
          <h1>Your day, in one quiet place.</h1>
          <p>
            Continue with the single Google account allowed to open this
            dashboard.
          </p>
        </div>

        {feedback ? (
          <p className="form-error" role="alert">
            {feedback}
          </p>
        ) : null}

        {mode === "demo" ? (
          <Link className="button button-primary button-wide" href="/">
            <ArrowLeft aria-hidden="true" size={18} />
            Return to preview
          </Link>
        ) : mode === "unconfigured" || !googleAuthConfigured ? (
          <div className="inline-alert" role="status">
            <p>
              Dashboard setup is incomplete. Add the Supabase owner settings
              and Google OAuth credentials in Vercel, then redeploy.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}

        <p className="auth-note">
          Google verifies the login; the dashboard then checks the account
          against one server-only owner address.
        </p>
      </section>
      <aside className="auth-art" aria-hidden="true">
        <div className="sun-disc" />
        <div className="auth-art-card card-one">
          <span>Today</span>
          <strong>4 things</strong>
        </div>
        <div className="auth-art-card card-two">
          <span>Habits</span>
          <strong>¾ complete</strong>
        </div>
      </aside>
    </main>
  );
}
