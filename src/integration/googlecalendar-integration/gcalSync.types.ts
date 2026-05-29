import type { Auth } from "firebase/auth";
import type { CalendarEvent } from "@core/calendar/calendarEvent.types";

export type GoogleCalendarEvent = CalendarEvent;

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  summaryOverride?: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
};

export type UseGoogleCalendarIntegrationOptions = {
  authInstance?: Auth;
};

export type GCalSyncState = "idle" | "syncing" | "needsReconnect" | "error";

export type GCalConnectionStatus = "connected" | "needsReconnect" | "error";

export type GCalSilentReconnectResult =
  | boolean
  | "reconnected"
  | "needsReconnect"
  | "retryLater";

export type GCalSyncRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

export type GCalForceSyncOptions = Partial<GCalSyncRange>;

export type GCalSyncTokenMap = Record<string, string>;

export type GCalWritableEventInput = {
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
  projectId?: string;
};

export type GCalWritableEventUpdateInput = Partial<Omit<GCalWritableEventInput, "calendarId">> & {
  calendarId: string;
  eventId: string;
};

export type GCalWritableEventDeleteInput = {
  calendarId: string;
  eventId: string;
};

export type GCalRawIncrementalEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

export type GCalEventsListResponse = {
  items?: GCalRawIncrementalEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
};

export type GoogleCalendarApiListResponse = {
  items?: Array<{
    id?: string;
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

export type GoogleCalendarApiCalendarResponse = {
  id?: string;
  summary?: string;
  description?: string;
};

export type GoogleCalendarApiEventsResponse = {
  items?: GCalRawIncrementalEvent[];
  nextPageToken?: string;
};

export type GCalSyncEngineOptions = {
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

export type GCalSyncStartContext = {
  accessToken: string;
  selectedCalendarIds: Set<string>;
  calendars: GoogleCalendarListItem[];
};