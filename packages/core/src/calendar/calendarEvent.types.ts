export type CalendarEvent = {
  id: string;
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
};

export type GoogleCalendarEvent = CalendarEvent;