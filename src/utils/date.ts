/**
 * Formats a date for the dashboard clock (e.g., 4:30 PM).
 */
export function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Formats a date for the dashboard header (e.g., Monday, 7 May).
 */
export function formatDashboardDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(date);
}
