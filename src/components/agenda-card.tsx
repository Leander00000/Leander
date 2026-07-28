import { ArrowUpRight, CalendarDays, ExternalLink } from "lucide-react";

import { getCalendarEmbedConfig } from "@/lib/calendar";

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r/day";

export function AgendaCard() {
  const calendar = getCalendarEmbedConfig();
  const embedUrl = calendar.status === "configured" ? calendar.url : null;
  const statusLabel =
    calendar.status === "configured"
      ? "Embed configured"
      : calendar.status === "invalid"
        ? "Invalid URL"
        : "Not configured";

  return (
    <section
      className="dashboard-card agenda-card"
      data-connected={embedUrl ? true : undefined}
    >
      <div className="card-heading">
        <div>
          <p className="card-kicker">Google Calendar</p>
          <h2>Agenda</h2>
        </div>
        <span
          className={`status-pill ${
            calendar.status === "invalid"
              ? "status-invalid"
              : embedUrl
                ? ""
                : "status-planned"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {embedUrl ? (
        <div className="calendar-embed-shell">
          <iframe
            className="calendar-embed"
            src={embedUrl}
            title="Leander’s Google Calendar"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-popups allow-same-origin allow-scripts"
          />
        </div>
      ) : (
        <div className="agenda-placeholder">
          <span className="agenda-icon" aria-hidden="true">
            <CalendarDays size={24} strokeWidth={1.6} />
          </span>
          <div>
            <h3>
              {calendar.status === "invalid"
                ? "The calendar embed URL is invalid."
                : "Add your calendar embed."}
            </h3>
            <p>
              {calendar.status === "invalid"
                ? "Use the iframe URL copied from Styled Calendar. It starts with https://embed.styledcalendar.com/#."
                : "Paste the iframe URL from Styled Calendar into the deployment settings. The dashboard will show it here automatically."}
            </p>
          </div>
        </div>
      )}

      <div className="calendar-actions">
        <a
          className="button button-secondary button-wide"
          href={CALENDAR_URL}
          target="_blank"
          rel="noreferrer"
        >
          Open Google Calendar
          <ArrowUpRight aria-hidden="true" size={17} />
        </a>
        {embedUrl ? (
          <a
            className="icon-button"
            href={embedUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open embedded calendar in a new tab"
          >
            <ExternalLink aria-hidden="true" size={17} />
          </a>
        ) : null}
      </div>
    </section>
  );
}
