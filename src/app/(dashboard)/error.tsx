"use client";

import { RotateCcw } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-wrap narrow-page">
      <section className="dashboard-card error-card" role="alert">
        <p className="card-kicker">Something went wrong</p>
        <h1>The dashboard could not be loaded.</h1>
        <p>Your data was not changed. Try loading this page again.</p>
        <button className="button button-primary" type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" size={17} />
          Try again
        </button>
      </section>
    </div>
  );
}
