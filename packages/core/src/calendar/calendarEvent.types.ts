import type { CalendarRecurrenceRule } from "./calendarRecurrence";









export type CalendarEvent = { id: string;
  externalId?: string;
  accountId?: string;
  calendarId: string;
  projectId?: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
  accentColor: string;
  recurrenceRule?: CalendarRecurrenceRule;
};

export type GoogleCalendarEvent = CalendarEvent;
