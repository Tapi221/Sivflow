import type { CalendarRecurrenceRule, GoogleCalendarEvent } from "@core/calendar";



type IosCalendarPermissionStatus = "undetermined" | "granted" | "denied";
type IosCalendarConnectionStatus = "connected" | "needsPermission" | "unsupported" | "error";
type IosCalendarListItem = { id: string;
  title: string;
  color: string;
  sourceName?: string;
  allowsModifications: boolean;
  isDefault: boolean;
  selected: boolean;
};
type IosCalendarEvent = GoogleCalendarEvent & { source: "ios";
};
type IosCalendarRange = { rangeStart: Date;
  rangeEnd: Date;
};
type IosCalendarWritableEventInput = { calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
  projectId?: string;
  recurrenceRule?: CalendarRecurrenceRule | null;
};
type IosCalendarWritableEventUpdateInput = Partial<Omit<IosCalendarWritableEventInput, "calendarId">> & { calendarId: string;
  eventId: string;
};
type IosCalendarWritableEventDeleteInput = { calendarId: string;
  eventId: string;
};

export type { IosCalendarPermissionStatus, IosCalendarConnectionStatus, IosCalendarListItem, IosCalendarEvent, IosCalendarRange, IosCalendarWritableEventInput, IosCalendarWritableEventUpdateInput, IosCalendarWritableEventDeleteInput };
