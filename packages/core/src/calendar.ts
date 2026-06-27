type CalendarRecurrenceRule = {
  frequency?: string;
  interval?: number;
  until?: Date | null;
  count?: number | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  accentColor: string;
  [key: string]: unknown;
};

export type { CalendarEvent, CalendarRecurrenceRule };
