/**
 * Google Calendar インクリメンタル同期エンジン 専用型定義
 *
 * syncToken ベースの差分取得に必要な型をここに集約する。
 */

import type { Auth } from "firebase/auth";

// ─────────────────────────────────────────────────────────────
// カレンダーイベント
// ─────────────────────────────────────────────────────────────

export interface GoogleCalendarEvent {
  id: string;

  calendarId: string;

  title: string;

  description?: string;

  location?: string;

  startsAt: Date;

  endsAt: Date;

  isAllDay: boolean;

  accentColor: string;
}

// ─────────────────────────────────────────────────────────────
// カレンダー一覧
// ─────────────────────────────────────────────────────────────

export interface GoogleCalendarListItem {
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

export interface UseGoogleCalendarIntegrationOptions {
  authInstance?: Auth;
}

// ─────────────────────────────────────────────────────────────
// 同期状態
// ─────────────────────────────────────────────────────────────

/** エンジンの現在の動作状態 */
export type GCalSyncState = "idle" | "syncing" | "error";

// ─────────────────────────────────────────────────────────────
// カレンダー ID → syncToken のマップ
// ─────────────────────────────────────────────────────────────

/** カレンダー ID をキーとした syncToken の辞書 */
export type GCalSyncTokenMap = Record<string, string>;

// ─────────────────────────────────────────────────────────────
// Google Calendar API の生レスポンス型
// ─────────────────────────────────────────────────────────────

/**
 * events.list レスポンスの個別イベント。
 * インクリメンタル同期では
 * `status: "cancelled"` が削除を表す。
 */
export interface GCalRawIncrementalEvent {
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
export interface GCalEventsListResponse {
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

export interface GCalSyncEngineOptions {
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

export interface GCalSyncStartContext {
  /**
   * 現在有効な accessToken
   */
  accessToken: string;

  /**
   * 同期対象カレンダー
   */
  selectedCalendarIds: Set<string>;

  /**
   * カレンダー一覧
   */
  calendars: GoogleCalendarListItem[];
}
