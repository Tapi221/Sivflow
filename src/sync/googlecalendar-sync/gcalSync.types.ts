/**
 * Google Calendar インクリメンタル同期エンジン 専用型定義
 *
 * syncToken ベースの差分取得に必要な型をここに集約する。
 */

import type { CalendarEvent } from "@core/calendar/calendarEvent.types";
import type { Auth } from "firebase/auth";



// ─────────────────────────────────────────────────────────────
// カレンダーイベント
// ─────────────────────────────────────────────────────────────
type GoogleCalendarEvent = CalendarEvent;
// ─────────────────────────────────────────────────────────────
// カレンダー一覧
// ─────────────────────────────────────────────────────────────
interface GoogleCalendarListItem {
  id: string;

  summary: string;

  description?: string;

  backgroundColor?: string;

  foregroundColor?: string;

  primary?: boolean;

  selected?: boolean;
}
// ─────────────────────────────────────────────────────────────
// Hook options
// ─────────────────────────────────────────────────────────────
interface UseGoogleCalendarIntegrationOptions {
  authInstance?: Auth;
}
// ─────────────────────────────────────────────────────────────
// 同期状態
// ─────────────────────────────────────────────────────────────

/** エンジンの現在の動作状態 */
type GCalSyncState = "idle" | "syncing" | "needsReconnect" | "error";
type GCalConnectionStatus = "connected" | "needsReconnect" | "error";
type GCalSyncRange = {
  rangeStart: Date;
  rangeEnd: Date;
};
type GCalForceSyncOptions = Partial<GCalSyncRange>;
// ─────────────────────────────────────────────────────────────
// カレンダー ID → syncToken のマップ
// ─────────────────────────────────────────────────────────────

/** カレンダー ID をキーとした syncToken の辞書 */
type GCalSyncTokenMap = Record<string, string>;
// ─────────────────────────────────────────────────────────────
// Google Calendar API の生レスポンス型
// ─────────────────────────────────────────────────────────────

/**
 * events.list レスポンスの個別イベント。
 * インクリメンタル同期では
 * `status: "cancelled"` が削除を表す。
 */
interface GCalRawIncrementalEvent {
  id?: string;

  summary?: string;

  description?: string;

  location?: string;

  status?: "confirmed" | "tentative" | "cancelled";

  start?: {
    date?: string;
    dateTime?: string;
  };

  end?: {
    date?: string;
    dateTime?: string;
  };
}
/** events.list API レスポンス全体 */
interface GCalEventsListResponse {
  items?: GCalRawIncrementalEvent[];

  /**
   * 次回インクリメンタル同期に使う
   * syncToken（最終ページのみ付与）
   */
  nextSyncToken?: string;

  /**
   * ページネーション用
   * syncToken ページング中は
   * nextPageToken が付く
   */
  nextPageToken?: string;
}
// ─────────────────────────────────────────────────────────────
// エンジンのオプション
// ─────────────────────────────────────────────────────────────
interface GCalSyncEngineOptions {
  accountId?: string;

  /**
   * イベント追加
   */
  onEventAdded: (event: GoogleCalendarEvent) => void;

  /**
   * イベント更新
   */
  onEventUpdated: (event: GoogleCalendarEvent) => void;

  /**
   * イベント削除
   */
  onEventDeleted: (compositeId: string) => void;

  onEventsRangeReplaced?: (input: {
    calendarId: string;
    rangeStart: Date;
    rangeEnd: Date;
    events: GoogleCalendarEvent[];
  }) => void;

  /**
   * 同期状態変更
   */
  onSyncStateChange: (state: GCalSyncState) => void;

  /**
   * 最終同期時刻変更
   */
  onLastSyncedAtChange: (at: Date) => void;

  /**
   * エラー通知
   */
  onError: (error: Error) => void;

  /**
   * ポーリング間隔
   */
  pollIntervalMs?: number;

  /**
   * 現在の access token を返す
   */
  getAccessToken: () => string | null;

  /**
   * サイレント再接続
   */
  silentReconnect: () => Promise<boolean>;

  /**
   * フル同期時の過去バッファ日数
   */
  fullSyncPastDays?: number;

  /**
   * フル同期時の未来バッファ日数
   */
  fullSyncFutureDays?: number;
}
// ─────────────────────────────────────────────────────────────
// Sync start context
// ─────────────────────────────────────────────────────────────
interface GCalSyncStartContext {
  /** * 現在有効な accessToken */ accessToken: string;

  /**
   * 同期対象カレンダー
   */
  selectedCalendarIds: Set<string>;

  /**
   * カレンダー一覧
   */
  calendars: GoogleCalendarListItem[];
}

export type { GoogleCalendarEvent, GoogleCalendarListItem, UseGoogleCalendarIntegrationOptions, GCalSyncState, GCalConnectionStatus, GCalSyncRange, GCalForceSyncOptions, GCalSyncTokenMap, GCalRawIncrementalEvent, GCalEventsListResponse, GCalSyncEngineOptions, GCalSyncStartContext };
