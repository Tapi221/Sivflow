import type { GoogleAccountEntry } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import { useMultiAccountGoogleCalendar } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import type { GCalConnectionStatus } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { useGoogleTaskLists } from "@/features/calendar/googlecalendar-integration/useGoogleTaskLists";
import { useGoogleTasks } from "@/features/calendar/googlecalendar-integration/useGoogleTasks";
import { useServerStoredGoogleAccountBootstrap } from "@/features/calendar/googlecalendar-integration/useServerStoredGoogleAccountBootstrap";

export type { GoogleAccountEntry };

export const useGoogleCalendarLayer = () => {
  useServerStoredGoogleAccountBootstrap();

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
    updateAccountToken,
    isAnyConnecting,
  } = useMultiAccountGoogleCalendar();

  const taskLists = useGoogleTaskLists(accounts, updateAccountToken);
  const googleTasks = useGoogleTasks(
    accounts,
    taskLists.byAccount,
    updateAccountToken,
  );

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
    taskListsByAccount: taskLists.byAccount,
    googleTasksByAccount: googleTasks.byAccount,
    refreshGoogleTasks: googleTasks.refreshAll,
    retryGoogleTaskLists: taskLists.retryAll,
    createGoogleTask: googleTasks.createTask,
    updateGoogleTask: googleTasks.updateTask,
    moveGoogleTaskList: googleTasks.moveTaskList,
    deleteGoogleTask: googleTasks.removeTask,
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