import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import type {
  CalendarToolbarMode,
  CalendarViewMode,
} from "@/features/calendar/calendar.types";

import type { useGoogleCalendarIntegration } from "@/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration";

import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";
import { auth } from "@/services/firebase";

// ─────────────────────────────────────────────
// 型
// ─────────────────────────────────────────────

type GoogleCalendarSlice = Pick<
  ReturnType<typeof useGoogleCalendarIntegration>,
  "selectedCalendarIds"
> & {
  rangeController?: {
    ensureRangeLoaded: (start: Date, end: Date) => void;
  };
};

export type UseCalendarEventSyncOptions = {
  activeMode: CalendarToolbarMode;
  selectedViewMode: CalendarViewMode;
  visibleDays: Date[];
  monthTitleDate: Date;
  googleCalendar: GoogleCalendarSlice;
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useCalendarEventSync = ({
  googleCalendar,
  visibleDays,
}: UseCalendarEventSyncOptions): void => {
  const { selectedCalendarIds, rangeController } = googleCalendar;

  // ─────────────────────────────
  // auth
  // ─────────────────────────────

  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  // ─────────────────────────────
  // refs
  // ─────────────────────────────

  const rangeControllerRef = useRef(rangeController);
  rangeControllerRef.current = rangeController;

  const prevCalendarKeyRef = useRef<string>("");
  const prevRangeRef = useRef<string>("");

  // ─────────────────────────────
  // ★重要：値ベースで監視
  // ─────────────────────────────

  const calendarKey = Array.from(selectedCalendarIds)
    .slice()
    .sort()
    .join("|");

  // ─────────────────────────────
  // カレンダー切替時の軽い同期
  // ─────────────────────────────

  useEffect(() => {
    if (!visibleDays?.length) return;

    if (prevCalendarKeyRef.current === calendarKey) return;
    prevCalendarKeyRef.current = calendarKey;

    const start = visibleDays[0];
    const end = visibleDays.at(-1);

    if (!start || !end) return;

    rangeControllerRef.current?.ensureRangeLoaded(start, end);
  }, [calendarKey, visibleDays]);

  // ─────────────────────────────
  // スクロール・表示範囲同期
  // ─────────────────────────────

  useEffect(() => {
    if (!visibleDays?.length) return;
    if (!rangeControllerRef.current) return;

    const start = visibleDays[0];
    const end = visibleDays.at(-1);

    if (!start || !end) return;

    const key = `${start.getTime()}-${end.getTime()}`;

    if (prevRangeRef.current === key) return;
    prevRangeRef.current = key;

    rangeControllerRef.current.ensureRangeLoaded(start, end);
  }, [
    visibleDays[0]?.getTime(),
    visibleDays.at(-1)?.getTime(),
  ]);

  // ─────────────────────────────
  // push通知
  // ─────────────────────────────

  useGoogleCalendarPushSync({
    userId,
    selectedCalendarIds,
    onNotification: () => {
      const start = visibleDays?.[0];
      const end = visibleDays?.at(-1);

      if (!start || !end) return;

      rangeControllerRef.current?.ensureRangeLoaded(start, end);
    },
  });
};