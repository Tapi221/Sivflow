import { Platform } from "react-native";
import * as ExpoCalendar from "expo-calendar";
import type { Calendar as ExpoCalendarItem, Event as ExpoCalendarEvent, PermissionResponse } from "expo-calendar";
import type { IosCalendarEvent, IosCalendarListItem, IosCalendarPermissionStatus } from "./iosCalendar.types";

const IOS_CALENDAR_ACCOUNT_ID = "ios";
const IOS_CALENDAR_EVENT_ID_PREFIX = "ios";
const IOS_CALENDAR_DEFAULT_COLOR = "#3478f6";
const IOS_CALENDAR_NO_TITLE = "(No title)";

const normalizePermissionStatus = (response: PermissionResponse): IosCalendarPermissionStatus => {
  if (response.granted || response.status === "granted") return "granted";
  if (response.status === "denied") return "denied";
  return "undetermined";
};

const toValidDate = (value: Date | string | number | undefined | null): Date | null => {
  if (value === undefined || value === null) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const isValidRange = (rangeStart: Date, rangeEnd: Date): boolean => Number.isFinite(rangeStart.getTime()) && Number.isFinite(rangeEnd.getTime()) && rangeStart < rangeEnd;

const buildCompositeEventId = (calendarId: string, eventId: string): string => `${IOS_CALENDAR_EVENT_ID_PREFIX}:${calendarId}:${eventId}`;

const getEventTitle = (event: Pick<ExpoCalendarEvent, "title">): string => {
  const title = event.title.trim();

  return title.length > 0 ? title : IOS_CALENDAR_NO_TITLE;
};

const toIosCalendarListItem = (calendar: ExpoCalendarItem, defaultCalendarId: string | null): IosCalendarListItem => ({
  id: calendar.id,
  title: calendar.title,
  color: calendar.color || IOS_CALENDAR_DEFAULT_COLOR,
  sourceName: calendar.source?.name,
  allowsModifications: calendar.allowsModifications,
  isDefault: calendar.id === defaultCalendarId,
  selected: true,
});

const toIosCalendarEvent = (event: ExpoCalendarEvent, calendarsById: Map<string, IosCalendarListItem>): IosCalendarEvent | null => {
  const startsAt = toValidDate(event.startDate);
  const endsAt = toValidDate(event.endDate);

  if (!event.id || !event.calendarId || !startsAt || !endsAt) return null;

  const calendar = calendarsById.get(event.calendarId);

  return {
    id: buildCompositeEventId(event.calendarId, event.id),
    externalId: event.id,
    accountId: IOS_CALENDAR_ACCOUNT_ID,
    calendarId: event.calendarId,
    accentColor: calendar?.color ?? IOS_CALENDAR_DEFAULT_COLOR,
    title: getEventTitle(event),
    description: event.notes || undefined,
    location: event.location || undefined,
    startsAt,
    endsAt,
    isAllDay: Boolean(event.allDay),
    source: "ios",
  };
};

const getDefaultCalendarId = async (): Promise<string | null> => {
  try {
    return (await ExpoCalendar.getDefaultCalendarAsync()).id;
  } catch {
    return null;
  }
};

export const isIosCalendarSupported = (): boolean => Platform.OS === "ios";

export const getIosCalendarPermissionStatus = async (): Promise<IosCalendarPermissionStatus> => {
  if (!isIosCalendarSupported()) return "denied";

  return normalizePermissionStatus(await ExpoCalendar.getCalendarPermissionsAsync());
};

export const requestIosCalendarPermission = async (): Promise<IosCalendarPermissionStatus> => {
  if (!isIosCalendarSupported()) return "denied";

  return normalizePermissionStatus(await ExpoCalendar.requestCalendarPermissionsAsync());
};

export const fetchIosCalendars = async (): Promise<IosCalendarListItem[]> => {
  if (!isIosCalendarSupported()) return [];

  const [calendars, defaultCalendarId] = await Promise.all([
    ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT),
    getDefaultCalendarId(),
  ]);

  return calendars
    .filter((calendar) => calendar.id.length > 0 && calendar.title.length > 0)
    .map((calendar) => toIosCalendarListItem(calendar, defaultCalendarId));
};

export const fetchIosEvents = async ({ calendarIds, calendars, rangeStart, rangeEnd }: { calendarIds: string[]; calendars: IosCalendarListItem[]; rangeStart: Date; rangeEnd: Date }): Promise<IosCalendarEvent[]> => {
  if (!isIosCalendarSupported() || calendarIds.length === 0 || !isValidRange(rangeStart, rangeEnd)) return [];

  const calendarsById = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  const events = await ExpoCalendar.getEventsAsync(calendarIds, rangeStart, rangeEnd);

  return events
    .map((event) => toIosCalendarEvent(event, calendarsById))
    .filter((event): event is IosCalendarEvent => Boolean(event));
};
