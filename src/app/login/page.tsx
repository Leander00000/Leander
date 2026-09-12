import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { getAppMode } from "@/lib/config";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">L</span>
          <span>Leander</span>
        </Link>
        <div className="auth-copy">
          <p className="kicker">Your personal space</p>
          <h1>Your day, one tap away.</h1>
          <p>No password. No Google sign-in.</p>
        </div>
        {getAppMode() === "demo" ? (
          <Link className="button button-primary" href="/">
            Open preview
          </Link>
        ) : (
          <LoginForm />
        )}
      </section>
      <aside className="auth-art" aria-hidden="true">
        <div className="sun-disc" />
        <div className="auth-art-card card-one">
          <span>Small steps</span>
          <strong>Real progress</strong>
        </div>
      </aside>
    </main>
  );
}
