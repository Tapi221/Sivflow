import type { GCalConnectionStatus, GCalSyncState, GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";



type GoogleAccountEntry = {
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
type GoogleAccountTokenUpdate = {
  accountId: string;
  accessToken: string;
  refreshToken?: string | null;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  expiresInSeconds?: number | null;
};
type GoogleAccountsAction = | { type: "ADD"; account: GoogleAccountEntry; }
  | { type: "REMOVE"; id: string; }
  | { type: "SET_CONNECTING"; id: string; value: boolean; }
  | {
    type: "SET_TOKEN";
    id: string;
    accessToken: string;
    refreshToken?: string | null;
    accountName?: string | null;
    accountPhotoUrl?: string | null;
  }
  | { type: "SET_CALENDARS"; id: string; calendars: GoogleCalendarListItem[]; }
  | { type: "SET_CALENDAR_IDS"; id: string; ids: string[]; }
  | { type: "TOGGLE_CALENDAR"; id: string; calendarId: string; }
  | { type: "SET_SYNC_STATE"; id: string; syncState: GCalSyncState; }
  | { type: "SET_LAST_SYNCED_AT"; id: string; at: Date; }
  | { type: "NEEDS_RECONNECT"; id: string; error?: string | null; }
  | { type: "SET_ERROR"; id: string; error: string | null; };



const reduceGoogleCalendarAccounts = (state: GoogleAccountEntry[], action: GoogleAccountsAction): GoogleAccountEntry[] => {
  switch (action.type) { case "ADD": return state.some((account) => account.id === action.account.id) ? state.map((account) => account.id === action.account.id ? action.account : account) : [...state, action.account];

    case "REMOVE":
      return state.filter((account) => account.id !== action.id);

    case "SET_CONNECTING":
      return state.map((account) =>
        account.id === action.id
          ? { ...account, isConnecting: action.value }
          : account,
      );

    case "SET_TOKEN":
      return state.map((account) => {
        if (account.id !== action.id) return account;

        return {
          ...account,
          accessToken: action.accessToken,
          name: action.accountName ?? account.name,
          photoUrl: action.accountPhotoUrl ?? account.photoUrl,
          connectionStatus: "connected",
          syncState: account.syncState === "needsReconnect" ? "idle" : account.syncState,
          error: null,
          ...(action.refreshToken !== undefined
            ? { refreshToken: action.refreshToken }
            : {}),
        };
      });

    case "SET_CALENDARS":
      return state.map((account) =>
        account.id === action.id
          ? { ...account, calendars: action.calendars }
          : account,
      );

    case "SET_CALENDAR_IDS":
      return state.map((account) =>
        account.id === action.id
          ? { ...account, selectedCalendarIds: new Set(action.ids) }
          : account,
      );

    case "TOGGLE_CALENDAR":
      return state.map((account) => {
        if (account.id !== action.id) return account;

        const next = new Set(account.selectedCalendarIds);

        if (next.has(action.calendarId)) {
          next.delete(action.calendarId);
        } else {
          next.add(action.calendarId);
        }

        return { ...account, selectedCalendarIds: next };
      });

    case "SET_SYNC_STATE":
      return state.map((account) =>
        account.id === action.id
          ? {
            ...account,
            syncState: action.syncState,
            connectionStatus:
              action.syncState === "needsReconnect"
                ? "needsReconnect"
                : action.syncState === "error"
                  ? "error"
                  : account.accessToken
                    ? "connected"
                    : account.connectionStatus,
            error:
              action.syncState === "idle" && account.connectionStatus === "error"
                ? null
                : account.error,
          }
          : account,
      );

    case "SET_LAST_SYNCED_AT":
      return state.map((account) =>
        account.id === action.id ? { ...account, lastSyncedAt: action.at } : account,
      );

    case "NEEDS_RECONNECT":
      return state.map((account) =>
        account.id === action.id
          ? {
            ...account,
            accessToken: null,
            connectionStatus: "needsReconnect",
            syncState: "needsReconnect",
            error: action.error ?? "Google Calendar の再連携が必要です",
          }
          : account,
      );

    case "SET_ERROR":
      return state.map((account) =>
        account.id === action.id
          ? {
            ...account,
            error: action.error,
            connectionStatus:
              action.error && account.syncState !== "needsReconnect"
                ? "error"
                : account.connectionStatus,
          }
          : account,
      );

    default:
      return state;
  }
};



export { reduceGoogleCalendarAccounts };


export type { GoogleAccountEntry, GoogleAccountTokenUpdate, GoogleAccountsAction };
