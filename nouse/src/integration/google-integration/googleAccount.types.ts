import type { GCalConnectionStatus, GCalSyncState, GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";



type GoogleConnectedServiceAccountEntry = {
  id: string;
  email: string | null;
  name: string | null;
  photoUrl: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  calendars: GoogleCalendarListItem[];
  selectedCalendarIds: Set<string>;
  syncState: GCalSyncState;
  connectionStatus: GCalConnectionStatus;
  lastSyncedAt: Date | null;
  isConnecting: boolean;
  error: string | null;
};
type GoogleConnectedServiceAccountTokenUpdate = {
  accountId: string;
  accessToken: string;
  refreshToken?: string | null;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  expiresInSeconds?: number | null;
};

export type { GoogleConnectedServiceAccountEntry, GoogleConnectedServiceAccountTokenUpdate };
