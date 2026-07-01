import { useCallback, useState } from "react";
import { SCHEDULE_EVENT_COLOR } from "@shared/design-tokens/color/Color.Schedule";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcal.api";
import type { GCalConnectionStatus, GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { GoogleAccountEntry } from "@/integration/googlecalendar-integration/useMultiAccountGoogleCalendar";
import { usePersistentMultiAccountGoogleCalendar } from "@/integration/googlecalendar-integration/usePersistentMultiAccountGoogleCalendar";
import { useServerStoredGoogleAccountBootstrap } from "@/integration/googlecalendar-integration/useServerStoredGoogleAccountBootstrap";
import { useGoogleTaskLists } from "@/integration/googletask-integration/useGoogleTaskLists";
import { useGoogleTasks } from "@/integration/googletask-integration/useGoogleTasks";



const RECURRENCE_REFRESH_FUTURE_DAYS = 366;
const GOOGLE_CALENDAR_EVENT_FALLBACK_ACCENT_COLOR = SCHEDULE_EVENT_COLOR.fallbackAccent;



const resolveExternalEventId = (accountId: string, calendarId: string, eventId: string): string => {
  const accountPrefix = `${accountId}:${calendarId}:`;
  const calendarPrefix = `${calendarId}:`;

  if (eventId.startsWith(accountPrefix)) return eventId.slice(accountPrefix.length);
  if (eventId.startsWith(calendarPrefix)) return eventId.slice(calendarPrefix.length);

  return eventId;
};
const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const buildRefreshRange = (event: Pick<GoogleCalendarEvent, "startsAt" | "endsAt" | "recurrenceRule"> | { startsAt?: Date; endsAt?: Date; recurrenceRule?: GoogleCalendarEvent["recurrenceRule"]; }) => {
  const { startsAt, endsAt, recurrenceRule } = event;
  if (!startsAt || !endsAt) return null;

  const rangeStart = startsAt <= endsAt ? startsAt : endsAt;
  const eventRangeEnd = startsAt <= endsAt ? endsAt : startsAt;
  const recurrenceRangeEnd = recurrenceRule?.endDate ?? (recurrenceRule ? addDays(rangeStart, RECURRENCE_REFRESH_FUTURE_DAYS) : null);
  const rangeEnd = recurrenceRangeEnd && recurrenceRangeEnd > eventRangeEnd ? recurrenceRangeEnd : eventRangeEnd;

  return { rangeStart, rangeEnd };
};
const useGoogleCalendarLayer = () => {
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
      accentColor: calendar?.backgroundColor ?? GOOGLE_CALENDAR_EVENT_FALLBACK_ACCENT_COLOR,
      event,
    });

    const range = buildRefreshRange(created);
    if (range) await forceSyncRange(range);

    return created;
  }, [forceSyncRange, getWritableAccount]);

  const updateCalendarEvent = useCallback(async (accountId: string, event: GCalWritableEventUpdateInput): Promise<GoogleCalendarEvent> => {
    const account = await getWritableAccount(accountId);
    const calendar = account.calendars.find((item) => item.id === event.calendarId);
    const updated = await updateGoogleCalendarEvent({
      accessToken: account.accessToken!,
      accountId,
      accentColor: calendar?.backgroundColor ?? GOOGLE_CALENDAR_EVENT_FALLBACK_ACCENT_COLOR,
      event: {
        ...event,
        eventId: resolveExternalEventId(accountId, event.calendarId, event.eventId),
      },
    });

    const range = buildRefreshRange(updated);
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



export { useGoogleCalendarLayer };


export type { GoogleAccountEntry };
