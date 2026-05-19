/**
 * useCalendarEventSync.ts
 *
 * 責務：
 *   1. Google Calendar Push通知を受信したら即時強制同期する
 *   2. カレンダー選択変更時に forceSync を実行する
 *
 * SyncEngine が唯一の source of truth になったため、
 * visible range に応じた loadEvents は廃止。
 *
 * 【依存関係】
 *   useCalendarPane
 *     └─ useCalendarEventSync
 *           ├─ useGoogleCalendarIntegration（forceSync / selectedCalendarIds）
 *           └─ useGoogleCalendarPushSync（Push通知 → forceSync）
 */

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/services/firebase";

import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";

import type {
  CalendarToolbarMode,
  CalendarViewMode,
} from "@/features/calendar/calendar.types";

import type { useGoogleCalendarIntegration } from "@/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration";

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

type GoogleCalendarSlice = Pick<
  ReturnType<typeof useGoogleCalendarIntegration>,
  "forceSync" | "selectedCalendarIds" | "selectedCalendarIdList"
>;

export type UseCalendarEventSyncOptions = {
  /** 現在のツールバーモード（calendar / timeline / task） */
  activeMode: CalendarToolbarMode;

  /** 現在の表示モード（month / week / days） */
  selectedViewMode: CalendarViewMode;

  /**
   * タイムライン・週表示・日表示で描画中の日付配列。
   *
   * NOTE:
   * 現在は SyncEngine が全イベントを保持するため、
   * visibleDays は UI 側用途のみ。
   */
  visibleDays: Date[];

  /**
   * 月表示サイドバーの基準月。
   *
   * NOTE:
   * 現在は SyncEngine が全イベントを保持するため、
   * monthTitleDate は UI 側用途のみ。
   */
  monthTitleDate: Date;

  /** useGoogleCalendarIntegration から渡す必要最小限のスライス */
  googleCalendar: GoogleCalendarSlice;
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export const useCalendarEventSync = ({
  googleCalendar,
}: UseCalendarEventSyncOptions): void => {
  const { forceSync, selectedCalendarIds, selectedCalendarIdList } =
    googleCalendar;

  // ───────────────────────────────────────────────────────────
  // 認証ユーザーID
  // ───────────────────────────────────────────────────────────

  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  // ───────────────────────────────────────────────────────────
  // forceSync ref stabilization
  // ───────────────────────────────────────────────────────────

  const forceSyncRef = useRef(forceSync);

  forceSyncRef.current = forceSync;

  // ───────────────────────────────────────────────────────────
  // Calendar selection changed
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    void forceSync();
  }, [forceSync, selectedCalendarIdList]);

  // ───────────────────────────────────────────────────────────
  // Push notification → immediate sync
  // ───────────────────────────────────────────────────────────

  useGoogleCalendarPushSync({
    userId,

    selectedCalendarIds,

    onNotification: (calendarId) => {
      console.info(
        `[CalendarEventSync] Push通知受信: calendarId=${calendarId} → 即時同期開始`,
      );

      void forceSyncRef.current();
    },
  });
};
