import type { Auth } from "firebase/auth";

export type GoogleCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
  accentColor: string;
};

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
};

export type GoogleTaskListItem = {
  id: string;
  title: string;
  updated?: string;
};

export type UseGoogleCalendarIntegrationOptions = {
  authInstance?: Auth;
};

export type GCalSyncState = "idle" | "syncing" | "needsReconnect" | "error";

export type GCalConnectionStatus = "connected" | "needsReconnect" | "error";

export type GCalSyncRange = {
  rangeStart: Date;
  rangeEnd: Date;
};

export type GCalForceSyncOptions = Partial<GCalSyncRange>;

export type GCalSyncTokenMap = Record<string, string>;

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
    description?: string;
    backgroundColor?: string;
    foregroundColor?: string;
    primary?: boolean;
    selected?: boolean;
  }>;
  nextPageToken?: string;
};

export type GoogleTasksApiTaskListsResponse = {
  items?: Array<{
    id?: string;
    title?: string;
    updated?: string;
  }>;
  nextPageToken?: string;
};

export type GoogleCalendarApiEventsResponse = {
  items?: GCalRawIncrementalEvent[];
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
  silentReconnect: () => Promise<boolean>;
  fullSyncPastDays?: number;
  fullSyncFutureDays?: number;
};

export type GCalSyncStartContext = {
  accessToken: string;
  selectedCalendarIds: Set<string>;
  calendars: GoogleCalendarListItem[];
};