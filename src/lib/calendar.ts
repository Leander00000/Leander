import "server-only";

export type CalendarEmbedConfig =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "configured"; url: string };

const STYLED_CALENDAR_ORIGIN = "https://embed.styledcalendar.com";
const EMBED_ID_PATTERN = /^[a-z0-9_-]{8,128}$/i;

export function getCalendarEmbedConfig(): CalendarEmbedConfig {
  const value = process.env.CALENDAR_EMBED_URL?.trim();
  if (!value) return { status: "missing" };

  try {
    const url = new URL(value);
    const embedId = url.hash.slice(1);
    const isStyledCalendarEmbed =
      url.origin === STYLED_CALENDAR_ORIGIN &&
      (url.pathname === "/" || url.pathname === "") &&
      !url.username &&
      !url.password &&
      !url.search &&
      EMBED_ID_PATTERN.test(embedId);

    return isStyledCalendarEmbed
      ? { status: "configured", url: `${STYLED_CALENDAR_ORIGIN}/#${embedId}` }
      : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}
