import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r/day";

export function AgendaCard() {
  return (
    <section className="dashboard-card agenda-card">
      <div className="card-heading">
        <div>
          <p className="card-kicker">Next connection</p>
          <h2>Agenda</h2>
        </div>
        <span className="status-pill status-planned">Planned</span>
      </div>

      <div className="agenda-placeholder">
        <span className="agenda-icon" aria-hidden="true">
          <CalendarDays size={24} strokeWidth={1.6} />
        </span>
        <div>
          <h3>Calendar is not connected yet.</h3>
          <p>
            V1 keeps this honest and useful: open your private calendar without
            exposing it here.
          </p>
        </div>
      </div>

      <div className="agenda-preview" aria-hidden="true">
        <Clock3 size={14} />
        <span>Today’s events will appear here</span>
        <span className="preview-line" />
      </div>

      <a
        className="button button-secondary button-wide"
        href={CALENDAR_URL}
        target="_blank"
        rel="noreferrer"
      >
        Open Google Calendar
        <ArrowUpRight aria-hidden="true" size={17} />
      </a>
    </section>
  );
}

