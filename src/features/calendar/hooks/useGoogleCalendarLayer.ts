import { useMultiAccountGoogleCalendar } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";
import type { GoogleAccountEntry } from "@/features/calendar/googlecalendar-integration/useMultiAccountGoogleCalendar";

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
    isAnyConnecting,
  } = useMultiAccountGoogleCalendar();

  return {
    // マルチアカウント
    googleAccounts: accounts,
    events,
    selectedCalendarIds,
    addAccount,
    removeAccount,
    toggleCalendar,
    forceSync,
    isAnyConnecting,

    // CalendarPane / useCalendarEventSync との後方互換
    isConnected: accounts.length > 0,
    isConnecting: isAnyConnecting,

    // レガシー互換（単一アカウント想定のコードが参照する場合）
    accountEmail: accounts[0]?.email ?? null,
    calendars: accounts[0]?.calendars ?? [],
    error: accounts[0]?.error ?? null,

    // connect は addAccount のエイリアス
    connect: addAccount,
  };
};
