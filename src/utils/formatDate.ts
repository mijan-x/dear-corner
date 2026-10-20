/** Dates and times in Bangladesh time, whatever the visitor's device says. */
const TZ = "Asia/Dhaka";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "Mon 20 Oct, 3:45 pm" */
export function formatDateTime(value: string | Date): string {
  return dateTime.format(new Date(value)).replace(" at ", ", ");
}

/** "Mon 20 Oct" */
export function formatDate(value: string | Date): string {
  return dateOnly.format(new Date(value));
}
