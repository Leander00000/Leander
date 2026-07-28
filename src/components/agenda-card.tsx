import type { CSSProperties } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  Settings2,
} from "lucide-react";

import type {
  GoogleCalendarAgenda,
  GoogleCalendarEvent,
  GoogleCalendarState,
} from "@/lib/google-calendar/data";

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r/agenda";
const AMSTERDAM_TIME_ZONE = "Europe/Amsterdam";

const dateHeadingFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  timeZone: AMSTERDAM_TIME_ZONE,
});
const dateDetailFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: AMSTERDAM_TIME_ZONE,
});
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: AMSTERDAM_TIME_ZONE,
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: AMSTERDAM_TIME_ZONE,
});

const STATE_LABELS: Record<GoogleCalendarState, string> = {
  connected: "Connected",
  "needs-reconnect": "Reconnect",
  "not-connected": "Not connected",
  "not-configured": "Setup needed",
  preview: "Preview",
  unavailable: "Unavailable",
};

type AgendaCardProps = {
  agenda: GoogleCalendarAgenda;
};

type AgendaGroup = {
  dateKey: string;
  date: Date;
  events: GoogleCalendarEvent[];
};

function parseEventDate(event: GoogleCalendarEvent) {
  if (event.allDay) {
    return new Date(`${event.start.slice(0, 10)}T12:00:00Z`);
  }

  return new Date(event.start);
}

function getDateKey(event: GoogleCalendarEvent) {
  return event.allDay
    ? event.start.slice(0, 10)
    : dateKeyFormatter.format(parseEventDate(event));
}

function groupEvents(events: GoogleCalendarEvent[]) {
  const groups = new Map<string, AgendaGroup>();

  for (const event of events) {
    const dateKey = getDateKey(event);
    const current = groups.get(dateKey);

    if (current) {
      current.events.push(event);
      continue;
    }

    groups.set(dateKey, {
      dateKey,
      date: parseEventDate(event),
      events: [event],
    });
  }

  return Array.from(groups.values());
}

function formatEventTime(event: GoogleCalendarEvent) {
  if (event.allDay) return "All day";

  const start = parseEventDate(event);
  if (!event.end) return timeFormatter.format(start);

  const end = new Date(event.end);
  if (
    !Number.isFinite(end.getTime()) ||
    getDateKey(event) !== dateKeyFormatter.format(end)
  ) {
    return timeFormatter.format(start);
  }

  return `${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
}

function AgendaEventRow({ event }: { event: GoogleCalendarEvent }) {
  const content = (
    <>
      <time className="agenda-event-time" dateTime={event.start}>
        {formatEventTime(event)}
      </time>
      <span
        className="agenda-event-marker"
        style={
          {
            "--event-color": event.calendarColor ?? "#5f8276",
          } as CSSProperties
        }
        aria-hidden="true"
      />
      <span className="agenda-event-copy">
        <span className="agenda-event-title-row">
          <strong>{event.title}</strong>
          {event.url ? <ArrowUpRight aria-hidden="true" size={14} /> : null}
        </span>
        <span className="agenda-event-meta">
          <span>{event.calendarName}</span>
          {event.location ? (
            <span className="agenda-event-location">
              <MapPin aria-hidden="true" size={12} />
              {event.location}
            </span>
          ) : null}
        </span>
      </span>
    </>
  );

  return event.url ? (
    <a
      className="agenda-event"
      href={event.url}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <div className="agenda-event">{content}</div>
  );
}

function AgendaEmptyState({
  state,
  error,
}: {
  state: GoogleCalendarState;
  error: string | null;
}) {
  if (error && state === "connected") {
    return (
      <div className="agenda-placeholder">
        <span className="agenda-icon" aria-hidden="true">
          <AlertCircle size={24} strokeWidth={1.6} />
        </span>
        <div>
          <h3>Agenda unavailable right now</h3>
          <p>
            Your Google connection is intact. Try loading the page again
            shortly.
          </p>
        </div>
      </div>
    );
  }

  const content = {
    "needs-reconnect": {
      title: "Reconnect your calendar",
      description:
        "Google authorization has expired. Reconnect to restore your agenda.",
    },
    "not-connected": {
      title: "Bring your schedule into view",
      description:
        "Connect Google Calendar for a private, read-only view of the next seven days.",
    },
    "not-configured": {
      title: "Connection setup is not finished",
      description:
        "The Google OAuth credentials still need to be added to this deployment.",
    },
    connected: {
      title: "The next seven days are clear",
      description: "New Google Calendar events will appear here automatically.",
    },
    preview: {
      title: "The next seven days are clear",
      description: "Preview events will appear here.",
    },
    unavailable: {
      title: "Calendar storage is unavailable",
      description:
        "The dashboard could not check the saved connection. Try again shortly.",
    },
  }[state];

  return (
    <div className="agenda-placeholder">
      <span className="agenda-icon" aria-hidden="true">
        <CalendarDays size={24} strokeWidth={1.6} />
      </span>
      <div>
        <h3>{content.title}</h3>
        <p>{content.description}</p>
      </div>
    </div>
  );
}

export function AgendaCard({ agenda }: AgendaCardProps) {
  const groups = groupEvents(agenda.events);
  const canShowEvents =
    agenda.state === "connected" || agenda.state === "preview";
  const requiresConnection =
    agenda.state === "not-connected" || agenda.state === "needs-reconnect";
  const isAttentionState =
    agenda.state === "needs-reconnect" ||
    agenda.state === "unavailable" ||
    Boolean(agenda.error);

  return (
    <section className="dashboard-card agenda-card" data-state={agenda.state}>
      <div className="card-heading">
        <div>
          <p className="card-kicker">Google Calendar</p>
          <h2>Next 7 days</h2>
        </div>
        <span
          className={`status-pill ${
            isAttentionState
              ? "status-invalid"
              : agenda.state === "not-connected" ||
                  agenda.state === "not-configured"
                ? "status-planned"
                : ""
          }`}
        >
          {agenda.error && agenda.state === "connected"
            ? "Limited"
            : STATE_LABELS[agenda.state]}
        </span>
      </div>

      {agenda.error &&
      agenda.state === "connected" &&
      groups.length > 0 ? (
        <div className="agenda-notice" role="status">
          <AlertCircle aria-hidden="true" size={16} />
          <p>{agenda.error}</p>
        </div>
      ) : null}

      {canShowEvents && groups.length > 0 ? (
        <div className="agenda-groups">
          {groups.map((group) => (
            <section className="agenda-day" key={group.dateKey}>
              <div className="agenda-day-heading">
                <h3>{dateHeadingFormatter.format(group.date)}</h3>
                <span>{dateDetailFormatter.format(group.date)}</span>
              </div>
              <div className="agenda-day-events">
                {group.events.map((event) => (
                  <AgendaEventRow event={event} key={event.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <AgendaEmptyState state={agenda.state} error={agenda.error} />
      )}

      {canShowEvents && groups.length > 0 && agenda.hasMore ? (
        <p className="agenda-more">
          Showing a focused preview. Open Google Calendar for the complete
          week.
        </p>
      ) : null}

      <div className="agenda-actions">
        {requiresConnection ? (
          <a
            className="button button-primary button-wide"
            href="/api/google/calendar/connect"
          >
            <CalendarDays aria-hidden="true" size={17} />
            {agenda.state === "needs-reconnect"
              ? "Reconnect Google"
              : "Connect Google"}
          </a>
        ) : agenda.state === "not-configured" ? (
          <a className="button button-secondary button-wide" href="/settings">
            <Settings2 aria-hidden="true" size={17} />
            View setup status
          </a>
        ) : (
          <>
            <a
              className="button button-secondary button-wide"
              href={CALENDAR_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Clock3 aria-hidden="true" size={17} />
              Open Calendar
              <ArrowUpRight aria-hidden="true" size={15} />
            </a>
            <a
              className="icon-button"
              href="/settings"
              aria-label="Open Google Calendar settings"
            >
              <Settings2 aria-hidden="true" size={17} />
            </a>
          </>
        )}
      </div>
    </section>
  );
}
