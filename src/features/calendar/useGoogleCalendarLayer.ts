import { useCallback, useState } from "react";
import type { GoogleAccountEntry } from "@/integration/googlecalendar-integration/useMultiAccountGoogleCalendar";
import { useMultiAccountGoogleCalendar } from "@/integration/googlecalendar-integration/useMultiAccountGoogleCalendar";
import type { GCalConnectionStatus } from "@/integration/googlecalendar-integration/gcalSync.types";
import { useGoogleTaskLists } from "@/integration/googlecalendar-integration/useGoogleTaskLists";
import { useGoogleTasks } from "@/integration/googlecalendar-integration/useGoogleTasks";
import { useServerStoredGoogleAccountBootstrap } from "@/integration/googlecalendar-integration/useServerStoredGoogleAccountBootstrap";

export type { GoogleAccountEntry };

export const useGoogleCalendarLayer = () => {
  useServerStoredGoogleAccountBootstrap();
  const [taskListRetryNonce, setTaskListRetryNonce] = useState(0);

  const retryGoogleTaskLists = useCallback(() => {
    setTaskListRetryNonce((value) => value + 1);
  }, []);

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

  const taskListsByAccount = useGoogleTaskLists(accounts, updateAccountToken, taskListRetryNonce);
  const googleTasks = useGoogleTasks(
    accounts,
    taskListsByAccount,
    updateAccountToken,
  );

  const refreshGoogleTasks = useCallback(async () => {
    retryGoogleTaskLists();
    await googleTasks.refreshAll();
  }, [googleTasks, retryGoogleTaskLists]);

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
    googleTasksByAccount: googleTasks.byAccount,
    refreshGoogleTasks,
    retryGoogleTaskLists,
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