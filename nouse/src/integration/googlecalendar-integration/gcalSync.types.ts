import type { CalendarEvent, CalendarRecurrenceRule } from "@core/calendar";
import type { Auth } from "firebase/auth";



type GoogleCalendarEvent = CalendarEvent;
type GoogleCalendarListItem = {
  id: string;
  summary: string;
  summaryOverride?: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
};
type UseGoogleCalendarIntegrationOptions = {
  authInstance?: Auth;
};
type GCalSyncState = "idle" | "syncing" | "needsReconnect" | "error";
type GCalConnectionStatus = "connected" | "needsReconnect" | "error";
type GCalSilentReconnectResult = | boolean | "reconnected" | "needsReconnect" | "retryLater";
type GCalSyncRange = {
  rangeStart: Date;
  rangeEnd: Date;
};
type GCalForceSyncOptions = Partial<GCalSyncRange>;
type GCalSyncTokenMap = Record<string, string>;
type GCalWritableEventInput = {
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
  projectId?: string;
  recurrenceRule?: CalendarRecurrenceRule | null;
};
type GCalWritableEventUpdateInput = Partial<Omit<GCalWritableEventInput, "calendarId">> & { calendarId: string;
  eventId: string;
};
type GCalWritableEventDeleteInput = {
  calendarId: string;
  eventId: string;
};
type GCalRawIncrementalEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  recurrence?: string[];
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};
type GCalEventsListResponse = {
  items?: GCalRawIncrementalEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
};
type GoogleCalendarApiListResponse = {
  items?: Array<{ id?: string;
    summary?: string;
    summaryOverride?: string;
    description?: string;
    backgroundColor?: string;
    foregroundColor?: string;
    primary?: boolean;
    selected?: boolean;
  }>;
  nextPageToken?: string;
};
type GoogleCalendarApiCalendarResponse = {
  id?: string;
  summary?: string;
  description?: string;
};
type GoogleCalendarApiEventsResponse = {
  items?: GCalRawIncrementalEvent[];
  nextPageToken?: string;
};
type GCalSyncEngineOptions = {
  accountId?: string;
  onEventAdded: (event: GoogleCalendarEvent) => void;
  onEventUpdated: (event: GoogleCalendarEvent) => void;
  onEventDeleted: (compositeId: string) => void;
  onEventsRangeReplaced?: (input: {
    calendarId: string;
    rangeStart: Date;
    rangeEnd: Date;
    events: GoogleCalendarEvent[];
  }) => void;
  onSyncStateChange: (state: GCalSyncState) => void;
  onLastSyncedAtChange: (at: Date) => void;
  onError: (error: Error) => void;
  pollIntervalMs?: number;
  getAccessToken: () => string | null;
  silentReconnect: () => Promise<GCalSilentReconnectResult>;
  fullSyncPastDays?: number;
  fullSyncFutureDays?: number;
};
type GCalSyncStartContext = {
  accessToken: string;
  selectedCalendarIds: Set<string>;
  calendars: GoogleCalendarListItem[];
};

export type { GoogleCalendarEvent, GoogleCalendarListItem, UseGoogleCalendarIntegrationOptions, GCalSyncState, GCalConnectionStatus, GCalSilentReconnectResult, GCalSyncRange, GCalForceSyncOptions, GCalSyncTokenMap, GCalWritableEventInput, GCalWritableEventUpdateInput, GCalWritableEventDeleteInput, GCalRawIncrementalEvent, GCalEventsListResponse, GoogleCalendarApiListResponse, GoogleCalendarApiCalendarResponse, GoogleCalendarApiEventsResponse, GCalSyncEngineOptions, GCalSyncStartContext };
