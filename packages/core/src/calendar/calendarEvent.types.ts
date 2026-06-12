import type { CalendarRecurrenceRule } from "./calendarRecurrence";



type CalendarEvent = { id: string;
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
type GoogleCalendarEvent = CalendarEvent;

export type { CalendarEvent, GoogleCalendarEvent };
