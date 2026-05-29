import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

export type IosCalendarPermissionStatus = "undetermined" | "granted" | "denied";

export type IosCalendarConnectionStatus = "connected" | "needsPermission" | "unsupported" | "error";

export type IosCalendarListItem = {
  id: string;
  title: string;
  color: string;
  sourceName?: string;
  allowsModifications: boolean;
  isDefault: boolean;
  selected: boolean;
};

export type IosCalendarEvent = GoogleCalendarEvent & {
  source: "ios";
};

export type IosCalendarRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

export type IosCalendarWritableEventInput = {
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
  projectId?: string;
};

export type IosCalendarWritableEventUpdateInput = Partial<Omit<IosCalendarWritableEventInput, "calendarId">> & {
  calendarId: string;
  eventId: string;
};

export type IosCalendarWritableEventDeleteInput = {
  calendarId: string;
  eventId: string;
};
