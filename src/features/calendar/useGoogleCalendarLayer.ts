import type { GoogleAccountEntry } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import { useMultiAccountGoogleCalendar } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import type { GCalConnectionStatus } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { useGoogleTaskLists } from "@/features/calendar/googlecalendar-integration/useGoogleTaskLists";
import { useGoogleTasks } from "@/features/calendar/googlecalendar-integration/useGoogleTasks";

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

  const taskListsByAccount = useGoogleTaskLists(accounts);
  const googleTasksByAccount = useGoogleTasks(accounts, taskListsByAccount);

  const connectionStatus: GCalConnectionStatus | "disconnected" = (() => {
    const hasConnectedAccount = accounts.some(
      (account) => account.connectionStatus === "connected",
    );

    if (hasConnectedAccount) return "connected";

    if (accounts.some((account) => account.connectionStatus === "needsReconnect")) {
      return "needsReconnect";
    }

    if (accounts.some((account) => account.connectionStatus === "error")) {
      return "error";
    }

    return "disconnected";
  })();

  const needsReconnect = accounts.some(
    (account) => account.connectionStatus === "needsReconnect",
  );

  return {
    googleAccounts: accounts,
    taskListsByAccount,
    googleTasksByAccount,
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
    needsReconnect,
    isConnecting: isAnyConnecting,

    accountEmail: accounts[0]?.email ?? null,
    calendars: accounts[0]?.calendars ?? [],
    error: accounts[0]?.error ?? null,

    connect: addAccount,
  };
};