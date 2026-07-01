import type { GoogleCalendarEvent, GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";



type GoogleCalendarEventsState = Map<string, Map<string, GoogleCalendarEvent>>;
type GoogleCalendarEventsAction = | { type: "UPSERT"; accountId: string; event: GoogleCalendarEvent; }
  | { type: "DELETE"; accountId: string; eventId: string; }
  | {
    type: "REPLACE_RANGE";
    accountId: string;
    calendarId: string;
    rangeStart: Date;
    rangeEnd: Date;
    events: GoogleCalendarEvent[];
  }
  | {
    type: "APPLY_CALENDAR_COLORS";
    accountId: string;
    calendars: GoogleCalendarListItem[];
  }
  | { type: "CLEAR_ACCOUNT"; accountId: string; };



const overlapsRange = (
  event: GoogleCalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
) => event.startsAt < rangeEnd && event.endsAt > rangeStart;
const reduceGoogleCalendarEvents = (state: GoogleCalendarEventsState, action: GoogleCalendarEventsAction): GoogleCalendarEventsState => {
  switch (action.type) { case "UPSERT": {
    const next = new Map(state);
    const bucket = new Map(next.get(action.accountId) ?? []);

    bucket.set(action.event.id, action.event);
    next.set(action.accountId, bucket);

    return next;
  }

    case "DELETE": {
      const next = new Map(state);
      const bucket = next.get(action.accountId);

      if (!bucket?.has(action.eventId)) return next;

      const newBucket = new Map(bucket);

      newBucket.delete(action.eventId);
      next.set(action.accountId, newBucket);

      return next;
    }

    case "REPLACE_RANGE": {
      const next = new Map(state);
      const bucket = new Map(next.get(action.accountId) ?? []);

      for (const [eventId, event] of bucket) {
        if (
          event.calendarId === action.calendarId &&
          overlapsRange(event, action.rangeStart, action.rangeEnd)
        ) {
          bucket.delete(eventId);
        }
      }

      for (const event of action.events) {
        bucket.set(event.id, event);
      }

      next.set(action.accountId, bucket);

      return next;
    }

    case "APPLY_CALENDAR_COLORS": {
      const bucket = state.get(action.accountId);
      if (!bucket) return state;

      const colorByCalendarId = new Map(
        action.calendars
          .filter((calendar) => Boolean(calendar.backgroundColor))
          .map((calendar) => [calendar.id, calendar.backgroundColor!]),
      );

      if (colorByCalendarId.size === 0) return state;

      const newBucket = new Map<string, GoogleCalendarEvent>();
      let hasChanged = false;

      for (const [eventId, event] of bucket) {
        const color = colorByCalendarId.get(event.calendarId);

        if (color && color !== event.accentColor) {
          newBucket.set(eventId, { ...event, accentColor: color });
          hasChanged = true;
          continue;
        }

        newBucket.set(eventId, event);
      }

      if (!hasChanged) return state;

      const next = new Map(state);
      next.set(action.accountId, newBucket);
      return next;
    }

    case "CLEAR_ACCOUNT": {
      const next = new Map(state);

      next.delete(action.accountId);

      return next;
    }

    default:
      return state;
  }
};
const selectVisibleGoogleCalendarEvents = (accounts: Array<{ id: string; selectedCalendarIds: Set<string>; }>,
  eventsState: GoogleCalendarEventsState,
): GoogleCalendarEvent[] => {
  const selectedByAccount = new Map(
    accounts.map((account) => [account.id, account.selectedCalendarIds]),
  );
  const all: GoogleCalendarEvent[] = [];

  for (const [accountId, bucket] of eventsState) {
    const selectedCalendarIds = selectedByAccount.get(accountId);

    if (!selectedCalendarIds) continue;

    for (const event of bucket.values()) {
      if (selectedCalendarIds.has(event.calendarId)) {
        all.push(event);
      }
    }
  }

  return all;
};
const selectCombinedSelectedCalendarIds = (accounts: Array<{ selectedCalendarIds: Set<string>; }>): Set<string> => {
  const set = new Set<string>();

  for (const account of accounts) {
    for (const id of account.selectedCalendarIds) {
      set.add(id);
    }
  }

  return set;
};



export { reduceGoogleCalendarEvents, selectVisibleGoogleCalendarEvents, selectCombinedSelectedCalendarIds };


export type { GoogleCalendarEventsState, GoogleCalendarEventsAction };
