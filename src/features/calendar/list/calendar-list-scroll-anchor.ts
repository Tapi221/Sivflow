type CalendarListScrollAnchor = {
  dateKey: string;
  offsetWithinDay: number;
};

const createCalendarListScrollAnchor = (dateKey: string, offsetWithinDay: number): CalendarListScrollAnchor => ({
  dateKey,
  offsetWithinDay,
});

export { createCalendarListScrollAnchor };
export type { CalendarListScrollAnchor };
