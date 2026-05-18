/**
 * useCalendarEventSync.ts
 *
 * 責務：
 *   1. 表示範囲の変化に応じて Google Calendar イベントを読み込む
 *   2. Google Calendar Push通知を受信したら即時強制同期する
 *
 * useCalendarPane.ts から以下を切り出したもの：
 *   - loadGoogleCalendarEvents を呼ぶ useEffect
 *   - useGoogleCalendarPushSync の接続（旧実装では未接続だったため、ここで完成させる）
 *
 * 【依存関係】
 *   useCalendarPane
 *     └─ useCalendarEventSync  ← このファイル
 *           ├─ useGoogleCalendarIntegration（loadEvents / forceSync / selectedCalendarIds）
 *           └─ useGoogleCalendarPushSync（Push通知 → forceSync）
 */

import { useEffect, useRef, useState } from "react";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/services/firebase";
import { useGoogleCalendarPushSync } from "./useGoogleCalendarPushSync";
import type { CalendarToolbarMode, CalendarViewMode } from "@/features/calendar/calendar.types";
import type { useGoogleCalendarIntegration } from "@/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration";

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

type GoogleCalendarSlice = Pick<
  ReturnType<typeof useGoogleCalendarIntegration>,
  | "loadEvents"
  | "forceSync"
  | "selectedCalendarIds"
  | "selectedCalendarIdList"
>;

export type UseCalendarEventSyncOptions = {
  /** 現在のツールバーモード（calendar / timeline / task） */
  activeMode: CalendarToolbarMode;
  /** 現在の表示モード（month / week / days） */
  selectedViewMode: CalendarViewMode;
  /**
   * タイムライン・週表示・日表示で描画中の日付配列。
   * 先頭と末尾が読み込み範囲になる。
   */
  visibleDays: Date[];
  /**
   * 月表示サイドバーの基準月。
   * activeMode === "calendar" && selectedViewMode === "month" のときに使用する。
   */
  monthTitleDate: Date;
  /** useGoogleCalendarIntegration から渡す必要最小限のスライス */
  googleCalendar: GoogleCalendarSlice;
};

// ─────────────────────────────────────────────────────────────
// フック本体
// ─────────────────────────────────────────────────────────────

/**
 * Google Calendar イベントの読み込みトリガーと
 * Push通知による即時同期を一括管理するフック。
 *
 * 戻り値なし（副作用専用）。
 */
export const useCalendarEventSync = ({
  activeMode,
  selectedViewMode,
  visibleDays,
  monthTitleDate,
  googleCalendar,
}: UseCalendarEventSyncOptions): void => {
  const {
    loadEvents: loadGoogleCalendarEvents,
    forceSync,
    selectedCalendarIds,
    selectedCalendarIdList,
  } = googleCalendar;

  // ── 認証ユーザーID（Push通知購読に必要）
  //    auth.currentUser は非リアクティブなため onAuthStateChanged で追跡する
  const [userId, setUserId] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  // ── forceSync を ref で安定化
  //    useGoogleCalendarPushSync に渡すコールバックが
  //    毎レンダーで参照変化しないようにする
  const forceSyncRef = useRef(forceSync);
  forceSyncRef.current = forceSync;

  // ── 表示範囲変化時のイベント読み込み
  //
  //    【分岐ロジック】
  //    ・calendar + month モード → monthTitleDate を中心に前後3ヶ月分をまとめて取得
  //      （月表示は大量の日付セルを一度に見るため広めのバッファが必要）
  //    ・それ以外（timeline / week / days）→ visibleDays の先頭〜末尾のみ取得
  useEffect(() => {
    if (activeMode === "calendar" && selectedViewMode === "month") {
      const rangeStart = startOfMonth(addMonths(monthTitleDate, -3));
      const rangeEnd = endOfMonth(addMonths(monthTitleDate, 3));
      void loadGoogleCalendarEvents(rangeStart, rangeEnd);
      return;
    }

    const rangeStart = visibleDays[0];
    const rangeEnd = visibleDays[visibleDays.length - 1];

    // visibleDays が空の場合はスキップ（初期化タイミングの安全ガード）
    if (!rangeStart || !rangeEnd) return;

    void loadGoogleCalendarEvents(rangeStart, rangeEnd);
  }, [
    activeMode,
    loadGoogleCalendarEvents,
    monthTitleDate,
    // selectedCalendarIdList を dep に含めることで
    // カレンダー選択変更時にも再取得が走る（selectedCalendarIds は Set なので比較不可）
    selectedCalendarIdList,
    selectedViewMode,
    visibleDays,
  ]);

  // ── Push通知受信 → 即時強制同期
  //
  //    Google Calendar Watch API → Cloud Functions Webhook
  //    → Firestore書き込み → onSnapshot → ここで forceSync() が呼ばれる
  //
  //    旧実装（useCalendarPane.ts）では useGoogleCalendarPushSync が
  //    どこにも接続されていなかったため、Push通知が届いても
  //    60秒ポーリングまで反映されなかった。このフックで接続を完成させる。
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