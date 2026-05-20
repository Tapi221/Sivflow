import type { GoogleAccountEntry } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import { useMultiAccountGoogleCalendar } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";

export type { GoogleAccountEntry };

export const useGoogleCalendarLayer = () => {
  const {
    accounts,
    events,
    selectedCalendarIds,
    addAccount,
    removeAccount,
    toggleCalendar,
    isAnyConnecting,
    rangeController,
  } = useMultiAccountGoogleCalendar();

  return {
    // ─────────────────────────────
    // マルチアカウント
    // ─────────────────────────────
    googleAccounts: accounts,
    events,
    selectedCalendarIds,
    addAccount,
    removeAccount,
    toggleCalendar,
    isAnyConnecting,

    // ─────────────────────────────
    // RangeController（今回の主役）
    // ─────────────────────────────
    rangeController,

    // ─────────────────────────────
    // SchedulePane互換レイヤー
    // ─────────────────────────────
    isConnected: accounts.length > 0,
    isConnecting: isAnyConnecting,

    accountEmail: accounts[0]?.email ?? null,
    calendars: accounts[0]?.calendars ?? [],
    error: accounts[0]?.error ?? null,

    connect: addAccount,
  };
};