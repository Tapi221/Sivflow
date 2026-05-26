import type { GoogleCalendarListItem } from "../gcalSync.types";

export type CachedGoogleCalendar = {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
};

export const toCachedCalendars = (calendars: GoogleCalendarListItem[]): CachedGoogleCalendar[] =>
  calendars.map(({ id, summary, summaryOverride, backgroundColor }) => ({
    id,
    summary,
    summaryOverride,
    backgroundColor,
  }));

export const getDefaultCalendarIds = (calendars: GoogleCalendarListItem[]): string[] =>
  calendars
    .filter((calendar) => calendar.primary || calendar.selected)
    .map((calendar) => calendar.id);

export const resolveSelectedCalendarIds = (
  storedIds: string[],
  calendars: GoogleCalendarListItem[],
): string[] => {
  const availableIds = new Set(calendars.map((calendar) => calendar.id));
  const availableStoredIds = storedIds.filter((id) => availableIds.has(id));

  return availableStoredIds.length > 0
    ? availableStoredIds
    : getDefaultCalendarIds(calendars);
};
