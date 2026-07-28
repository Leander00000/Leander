import { Database, KeyRound, Rocket } from "lucide-react";

export default function SetupPage() {
  return (
    <main className="setup-page">
      <section className="setup-card">
        <span className="brand-mark" aria-hidden="true">
          L
        </span>
        <p className="kicker">One final connection</p>
        <h1>Leander is ready for its private keys.</h1>
        <p className="setup-intro">
          The production site is intentionally locked until its Supabase
          project, owner account, stable origin, and Google OAuth clients are
          configured.
        </p>
        <ol className="setup-steps">
          <li>
            <Database aria-hidden="true" />
            <span>
              <strong>Connect Supabase</strong>
              Add the project URL and publishable key.
            </span>
          </li>
          <li>
            <KeyRound aria-hidden="true" />
            <span>
              <strong>Connect the owner profile</strong>
              Add the owner email and enable the dedicated sign-in Google
              project in Supabase Auth.
            </span>
          </li>
          <li>
            <Rocket aria-hidden="true" />
            <span>
              <strong>Redeploy</strong>
              Add the stable app origin and separate Calendar OAuth secrets in
              Vercel, then publish the dashboard.
            </span>
          </li>
        </ol>
        <p className="setup-footnote">
          See <code>.env.example</code> and <code>README.md</code> in the
          repository for the exact variable names.
        </p>
      </section>
    </main>
  );
}
