/**
 * Google Calendar インクリメンタル同期エンジン 専用型定義
 */

// ─────────────────────────────────────────────────────────────
// 基本型
// ─────────────────────────────────────────────────────────────

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

  primary?: boolean;

  selected?: boolean;

  backgroundColor?: string;
};

export type UseGoogleCalendarIntegrationOptions = {
  authInstance?: unknown;
};

// ─────────────────────────────────────────────────────────────
// 同期状態
// ─────────────────────────────────────────────────────────────

export type GCalSyncState = "idle" | "syncing" | "error";

// ─────────────────────────────────────────────────────────────
// syncToken map
// ─────────────────────────────────────────────────────────────

export type GCalSyncTokenMap = Record<string, string>;

// ─────────────────────────────────────────────────────────────
// Raw incremental event
// ─────────────────────────────────────────────────────────────

export interface GCalRawIncrementalEvent {
  id?: string;

  summary?: string;

  status?: "confirmed" | "tentative" | "cancelled";

  start?: {
    date?: string;
    dateTime?: string;
  };

  end?: {
    date?: string;
    dateTime?: string;
  };
}

export interface GCalEventsListResponse {
  items?: GCalRawIncrementalEvent[];

  nextSyncToken?: string;

  nextPageToken?: string;
}

// ─────────────────────────────────────────────────────────────
// Engine options
// ─────────────────────────────────────────────────────────────

export interface GCalSyncEngineOptions {
  onEventAdded: (event: GoogleCalendarEvent) => void;

  onEventUpdated: (event: GoogleCalendarEvent) => void;

  onEventDeleted: (compositeId: string) => void;

  onSyncStateChange: (state: GCalSyncState) => void;

  onLastSyncedAtChange: (at: Date) => void;

  onError: (error: Error) => void;

  pollIntervalMs?: number;

  getAccessToken: () => string | null;

  silentReconnect: () => Promise<boolean>;

  fullSyncPastDays?: number;

  fullSyncFutureDays?: number;
}

// ─────────────────────────────────────────────────────────────
// Sync start context
// ─────────────────────────────────────────────────────────────

export interface GCalSyncStartContext {
  accessToken: string;

  selectedCalendarIds: Set<string>;

  calendars: GoogleCalendarListItem[];
}
