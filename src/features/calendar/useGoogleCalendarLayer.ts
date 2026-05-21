import type { GoogleAccountEntry } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import { useMultiAccountGoogleCalendar } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import type { GCalConnectionStatus } from "@/features/calendar/googlecalendar-integration/gcalSync.types";

export type { GoogleAccountEntry };

export const useGoogleCalendarLayer = () => {
  const {
    accounts,
    events,
    selectedCalendarIds,
    addAccount,
    removeAccount,
    toggleCalendar,
    forceSync,
    forceSyncRange,
    retrySync,
    reconnectAccount,
    isAnyConnecting,
  } = useMultiAccountGoogleCalendar();

  const connectionStatus: GCalConnectionStatus | "disconnected" = (() => {
    if (accounts.some((account) => account.connectionStatus === "needsReconnect")) {
      return "needsReconnect";
    }

    if (accounts.some((account) => account.connectionStatus === "error")) {
      return "error";
    }

    const hasRecoverableAccount = accounts.some(
      (account) =>
        account.connectionStatus === "connected" &&
        (account.accessToken || account.refreshToken),
    );

    return hasRecoverableAccount ? "connected" : "disconnected";
  })();

  return {
    googleAccounts: accounts,
    events,
    selectedCalendarIds,
    addAccount,
    removeAccount,
    toggleCalendar,
    forceSync,
    forceSyncRange,
    retrySync,
    reconnectAccount,
    isAnyConnecting,
    connectionStatus,

    isConnected: connectionStatus === "connected",
    needsReconnect: connectionStatus === "needsReconnect",
    isConnecting: isAnyConnecting,

    accountEmail: accounts[0]?.email ?? null,
    calendars: accounts[0]?.calendars ?? [],
    error: accounts[0]?.error ?? null,

    connect: addAccount,
  };
};
