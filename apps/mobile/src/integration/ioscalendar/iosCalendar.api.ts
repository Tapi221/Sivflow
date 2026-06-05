import { Platform } from "react-native";
import * as ExpoCalendar from "expo-calendar";
import type { Calendar as ExpoCalendarItem, Event as ExpoCalendarEvent, PermissionResponse } from "expo-calendar";
import type { IosCalendarEvent, IosCalendarListItem, IosCalendarPermissionStatus, IosCalendarWritableEventDeleteInput, IosCalendarWritableEventInput, IosCalendarWritableEventUpdateInput } from "./iosCalendar.types";

type ExpoCalendarCreateEventDetails = NonNullable<Parameters<typeof ExpoCalendar.createEventAsync>[1]>;
type ExpoCalendarUpdateEventDetails = NonNullable<Parameters<typeof ExpoCalendar.updateEventAsync>[1]>;
type IosCalendarWritableEventDetails = Partial<ExpoCalendarCreateEventDetails & ExpoCalendarUpdateEventDetails>;

const IOS_CALENDAR_ACCOUNT_ID = "ios";
const IOS_CALENDAR_EVENT_ID_PREFIX = "ios";
const IOS_CALENDAR_DEFAULT_COLOR = "#3478f6";
const IOS_CALENDAR_NO_TITLE = "(No title)";
const IOS_CALENDAR_NOT_FOUND_ERROR = "iOSカレンダーが見つかりません";
const IOS_CALENDAR_READONLY_ERROR = "このiOSカレンダーは編集できません";

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

const resolveExternalEventId = (calendarId: string, eventId: string): string => {
  const accountPrefix = `${IOS_CALENDAR_ACCOUNT_ID}:${calendarId}:`;
  const sourcePrefix = `${IOS_CALENDAR_EVENT_ID_PREFIX}:${calendarId}:`;
  const calendarPrefix = `${calendarId}:`;

  if (eventId.startsWith(accountPrefix)) return eventId.slice(accountPrefix.length);
  if (eventId.startsWith(sourcePrefix)) return eventId.slice(sourcePrefix.length);
  if (eventId.startsWith(calendarPrefix)) return eventId.slice(calendarPrefix.length);

  return eventId;
};

const getEventTitle = (event: Pick<ExpoCalendarEvent, "title">): string => {
  const title = event.title.trim();

  return title.length > 0 ? title : IOS_CALENDAR_NO_TITLE;
};

const getWritableCalendar = (calendarId: string, calendars: IosCalendarListItem[]): IosCalendarListItem => {
  const calendar = calendars.find((item) => item.id === calendarId);

  if (!calendar) throw new Error(IOS_CALENDAR_NOT_FOUND_ERROR);
  if (!calendar.allowsModifications) throw new Error(IOS_CALENDAR_READONLY_ERROR);

  return calendar;
};

const toExpoEventPayload = (event: Partial<IosCalendarWritableEventInput>): IosCalendarWritableEventDetails => {
  const payload: IosCalendarWritableEventDetails = {};

  if (event.title !== undefined) payload.title = event.title.trim() || IOS_CALENDAR_NO_TITLE;
  if (event.description !== undefined) payload.notes = event.description;
  if (event.location !== undefined) payload.location = event.location;
  if (event.startsAt !== undefined) payload.startDate = event.startsAt;
  if (event.endsAt !== undefined) payload.endDate = event.endsAt;
  if (event.isAllDay !== undefined) payload.allDay = event.isAllDay;

  return payload;
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

const buildCalendarsById = (calendars: IosCalendarListItem[]): Map<string, IosCalendarListItem> => new Map(calendars.map((calendar) => [calendar.id, calendar]));

const fetchIosEventById = async (eventId: string, calendars: IosCalendarListItem[]): Promise<IosCalendarEvent> => {
  const event = await ExpoCalendar.getEventAsync(eventId);
  const parsed = toIosCalendarEvent(event, buildCalendarsById(calendars));

  if (!parsed) throw new Error("iOSカレンダー予定の取得結果が不正です");

  return parsed;
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

  const calendarsById = buildCalendarsById(calendars);
  const events = await ExpoCalendar.getEventsAsync(calendarIds, rangeStart, rangeEnd);

  return events
    .map((event) => toIosCalendarEvent(event, calendarsById))
    .filter((event): event is IosCalendarEvent => Boolean(event));
};

export const createIosCalendarEvent = async ({ event, calendars }: { event: IosCalendarWritableEventInput; calendars: IosCalendarListItem[] }): Promise<IosCalendarEvent> => {
  getWritableCalendar(event.calendarId, calendars);

  const eventId = await ExpoCalendar.createEventAsync(event.calendarId, toExpoEventPayload(event) as ExpoCalendarCreateEventDetails);

  return fetchIosEventById(eventId, calendars);
};

export const updateIosCalendarEvent = async ({ event, calendars }: { event: IosCalendarWritableEventUpdateInput; calendars: IosCalendarListItem[] }): Promise<IosCalendarEvent> => {
  getWritableCalendar(event.calendarId, calendars);

  const eventId = resolveExternalEventId(event.calendarId, event.eventId);
  await ExpoCalendar.updateEventAsync(eventId, toExpoEventPayload(event) as ExpoCalendarUpdateEventDetails);

  return fetchIosEventById(eventId, calendars);
};

export const deleteIosCalendarEvent = async ({ event, calendars }: { event: IosCalendarWritableEventDeleteInput; calendars: IosCalendarListItem[] }): Promise<void> => {
  getWritableCalendar(event.calendarId, calendars);

  await ExpoCalendar.deleteEventAsync(resolveExternalEventId(event.calendarId, event.eventId));
};
