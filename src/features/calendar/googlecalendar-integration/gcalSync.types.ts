/**
 * Google Calendar インクリメンタル同期エンジン 専用型定義
 *
 * syncToken ベースの差分取得に必要な型をここに集約する。
 */

import type { GoogleCalendarEvent, GoogleCalendarListItem } from "./useGoogleCalendarIntegration";

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
// Google Calendar API の生レスポンス型（インクリメンタル同期用）
// ─────────────────────────────────────────────────────────────

/**
 * events.list レスポンスの個別イベント。
 * インクリメンタル同期では `status: "cancelled"` が削除を表す。
 */
export interface GCalRawIncrementalEvent {
  id?: string;
  summary?: string;
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
  /** 次回インクリメンタル同期に使う syncToken（最終ページのみ付与） */
  nextSyncToken?: string;
  /** ページネーション用（syncToken ページング中は nextPageToken が付く） */
  nextPageToken?: string;
}

// ─────────────────────────────────────────────────────────────
// エンジンのオプション（依存注入）
// ─────────────────────────────────────────────────────────────

export interface GCalSyncEngineOptions {
  /**
   * イベントが新規追加されたときに呼ばれるコールバック。
   * フックの state 更新処理を渡す。
   */
  onEventAdded: (event: GoogleCalendarEvent) => void;

  /**
   * イベントが更新されたときに呼ばれるコールバック。
   * 同じ id で内容が変化している場合に発火する。
   */
  onEventUpdated: (event: GoogleCalendarEvent) => void;

  /**
   * イベントが削除されたときに呼ばれるコールバック。
   * `calendarId:eventId` 形式の複合 ID を受け取る。
   */
  onEventDeleted: (compositeId: string) => void;

  /** 同期状態が変化したときに呼ばれるコールバック */
  onSyncStateChange: (state: GCalSyncState) => void;

  /** 最終同期日時が更新されたときに呼ばれるコールバック */
  onLastSyncedAtChange: (at: Date) => void;

  /** エラーが発生したときに呼ばれるコールバック */
  onError: (error: Error) => void;

  /** ポーリング間隔（ミリ秒）。デフォルト 60_000 ms */
  pollIntervalMs?: number;

  /**
   * 現在有効な accessToken を返す関数。
   * トークンが期限切れの場合は null を返す。
   */
  getAccessToken: () => string | null;

  /**
   * サイレント再接続を試みる関数。
   * 成功時は true、失敗時は false を返す。
   */
  silentReconnect: () => Promise<boolean>;

  /**
   * フル同期時の取得範囲（過去方向のバッファ日数）。
   * デフォルト 30 日前から。
   */
  fullSyncPastDays?: number;

  /**
   * フル同期時の取得範囲（未来方向のバッファ日数）。
   * デフォルト 180 日後まで。
   */
  fullSyncFutureDays?: number;
}

// ─────────────────────────────────────────────────────────────
// エンジンの start() に渡すコンテキスト
// ─────────────────────────────────────────────────────────────

export interface GCalSyncStartContext {
  /** 現在有効な accessToken */
  accessToken: string;
  /** 同期対象のカレンダー ID セット */
  selectedCalendarIds: Set<string>;
  /** カレンダーリスト（色情報の取得に使用） */
  calendars: GoogleCalendarListItem[];
}
