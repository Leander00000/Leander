import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { getAppMode } from "@/lib/config";

export default function LoginPage() {
  const mode = getAppMode();

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
            Sign in with the single Google account allowed to open this
            dashboard.
          </p>
        </div>

        {mode === "demo" ? (
          <Link className="button button-primary button-wide" href="/">
            <ArrowLeft aria-hidden="true" size={18} />
            Return to preview
          </Link>
        ) : (
          <LoginForm />
        )}

        <p className="auth-note">
          Access is checked on the server. Your Todoist and Google credentials
          are never sent to the browser.
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

