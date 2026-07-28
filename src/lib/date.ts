const DEFAULT_TIME_ZONE = "Europe/Amsterdam";

export function getDateKey(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getWeekDates(
  endDate = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(endDate);
    date.setUTCDate(endDate.getUTCDate() - (6 - index));

    return {
      key: getDateKey(date, timeZone),
      day: new Intl.DateTimeFormat("en", {
        weekday: "narrow",
        timeZone,
      }).format(date),
      dayLong: new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone,
      }).format(date),
      isToday: index === 6,
    };
  });
}

export function getGreeting(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
) {
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      hour12: false,
      timeZone,
    }).format(date),
  );

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatFullDate(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
}

