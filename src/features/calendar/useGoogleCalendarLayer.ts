import { useCallback, useState } from "react";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcal.api";
import type { GCalConnectionStatus, GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { GoogleAccountEntry } from "@/integration/googlecalendar-integration/useMultiAccountGoogleCalendar";
import { usePersistentMultiAccountGoogleCalendar } from "@/integration/googlecalendar-integration/usePersistentMultiAccountGoogleCalendar";
import { useGoogleTaskLists } from "@/integration/googletask-integration/useGoogleTaskLists";
import { useGoogleTasks } from "@/integration/googletask-integration/useGoogleTasks";
import { useServerStoredGoogleAccountBootstrap } from "@/integration/googlecalendar-integration/useServerStoredGoogleAccountBootstrap";

export type { GoogleAccountEntry };

const resolveExternalEventId = (accountId: string, calendarId: string, eventId: string): string => {
  const accountPrefix = `${accountId}:${calendarId}:`;
  const calendarPrefix = `${calendarId}:`;

  if (eventId.startsWith(accountPrefix)) return eventId.slice(accountPrefix.length);
  if (eventId.startsWith(calendarPrefix)) return eventId.slice(calendarPrefix.length);

  return eventId;
};

const buildRefreshRange = (startsAt?: Date, endsAt?: Date) => {
  if (!startsAt || !endsAt) return null;

  return startsAt <= endsAt
    ? { rangeStart: startsAt, rangeEnd: endsAt }
    : { rangeStart: endsAt, rangeEnd: startsAt };
};

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
  } = usePersistentMultiAccountGoogleCalendar();

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

  const getWritableAccount = useCallback(async (accountId: string): Promise<GoogleAccountEntry> => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account) throw new Error(`Google Calendar account not found: ${accountId}`);

    if (account.accessToken) return account;

    await reconnectAccount(accountId);
    const reconnectedAccount = accounts.find((item) => item.id === accountId);

    if (!reconnectedAccount?.accessToken) {
      throw new Error("Google Calendar の再連携が必要です");
    }

    return reconnectedAccount;
  }, [accounts, reconnectAccount]);

  const createCalendarEvent = useCallback(async (accountId: string, event: GCalWritableEventInput): Promise<GoogleCalendarEvent> => {
    const account = await getWritableAccount(accountId);
    const calendar = account.calendars.find((item) => item.id === event.calendarId);
    const created = await createGoogleCalendarEvent({
      accessToken: account.accessToken!,
      accountId,
      accentColor: calendar?.backgroundColor ?? "#185FA5",
      event,
    });

    const range = buildRefreshRange(created.startsAt, created.endsAt);
    if (range) await forceSyncRange(range);

    return created;
  }, [forceSyncRange, getWritableAccount]);

  const updateCalendarEvent = useCallback(async (accountId: string, event: GCalWritableEventUpdateInput): Promise<GoogleCalendarEvent> => {
    const account = await getWritableAccount(accountId);
    const calendar = account.calendars.find((item) => item.id === event.calendarId);
    const updated = await updateGoogleCalendarEvent({
      accessToken: account.accessToken!,
      accountId,
      accentColor: calendar?.backgroundColor ?? "#185FA5",
      event: {
        ...event,
        eventId: resolveExternalEventId(accountId, event.calendarId, event.eventId),
      },
    });

    const range = buildRefreshRange(updated.startsAt, updated.endsAt);
    if (range) await forceSyncRange(range);

    return updated;
  }, [forceSyncRange, getWritableAccount]);

  const deleteCalendarEvent = useCallback(async (accountId: string, event: GCalWritableEventDeleteInput): Promise<void> => {
    const account = await getWritableAccount(accountId);

    await deleteGoogleCalendarEvent({
      accessToken: account.accessToken!,
      event: {
        ...event,
        eventId: resolveExternalEventId(accountId, event.calendarId, event.eventId),
      },
    });

    await forceSync();
  }, [forceSync, getWritableAccount]);

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
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
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
