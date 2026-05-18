/**
 * GoogleCalendarSyncEngine
 *
 * Google Calendar Incremental Sync（syncToken ベース）と
 * ポーリングを組み合わせたリアルタイム同期エンジン。
 *
 * 責務：
 *   - 初回フル同期で nextSyncToken を取得・保存
 *   - 一定間隔で events.list({syncToken}) を呼び出し差分を取得
 *   - 追加/更新/削除をコールバックで上位レイヤー（React フック）に通知
 *   - 401/410 エラーを適切にハンドリング
 *   - ウィンドウが非表示のときはポーリングを停止
 */

import { addDays, subDays } from "date-fns";
import type {
  GCalEventsListResponse,
  GCalRawIncrementalEvent,
  GCalSyncEngineOptions,
  GCalSyncStartContext,
  GCalSyncState,
  GCalSyncTokenMap,
} from "./gcalSync.types";
import type {
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "./useGoogleCalendarIntegration";

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

/** Google Calendar API のベース URL */
const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";

/** syncToken を保存する localStorage キー */
const SYNC_TOKENS_STORAGE_KEY = "flashcard-master.gcal.sync_tokens";

/** デフォルトのポーリング間隔（60 秒） */
const DEFAULT_POLL_INTERVAL_MS = 60_000;

/** エラー時の指数バックオフ：最大待機時間（10 分） */
const MAX_BACKOFF_MS = 10 * 60 * 1000;

/** エラー時の指数バックオフ：初期待機時間（60 秒） */
const INITIAL_BACKOFF_MS = 60_000;

/** フル同期のデフォルト過去範囲（日数） */
const DEFAULT_FULL_SYNC_PAST_DAYS = 30;

/** フル同期のデフォルト未来範囲（日数） */
const DEFAULT_FULL_SYNC_FUTURE_DAYS = 180;

// ─────────────────────────────────────────────────────────────
// localStorage ユーティリティ
// ─────────────────────────────────────────────────────────────

/** syncToken マップを localStorage から読み込む */
const readSyncTokens = (): GCalSyncTokenMap => {
  try {
    const raw = localStorage.getItem(SYNC_TOKENS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as GCalSyncTokenMap)
      : {};
  } catch {
    return {};
  }
};

/** syncToken マップを localStorage に書き込む */
const writeSyncTokens = (map: GCalSyncTokenMap): void => {
  try {
    localStorage.setItem(SYNC_TOKENS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // プライベートブラウジング等で失敗しても続行
  }
};

// ─────────────────────────────────────────────────────────────
// Google Calendar API ヘルパー
// ─────────────────────────────────────────────────────────────

/**
 * Bearer トークン付きで GET リクエストを発行し、JSON を返す。
 * HTTP エラー時は Error をスローする。
 */
const gcalGet = async <T>(
  accessToken: string,
  url: string,
): Promise<T> => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = new Error(
      `Google Calendar API エラー (${response.status}): ${url}`,
    );
    // ステータスコードをプロパティに付与して呼び出し元でハンドリング可能にする
    (error as Error & { status: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as T;
};

// ─────────────────────────────────────────────────────────────
// イベントパーサー（useGoogleCalendarIntegration.ts と同じロジックを共有）
// ─────────────────────────────────────────────────────────────

/**
 * "YYYY-MM-DD" または ISO 8601 文字列を Date に変換する。
 * 日付のみ形式（終日イベント）はローカルタイムで解釈する。
 */
const parseGoogleDate = (rawValue: string): Date => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(rawValue);
};

/**
 * イベントの開始日時を Date に変換する。
 * start が存在しない場合は null を返す。
 */
const parseEventStart = (
  start: GCalRawIncrementalEvent["start"],
): Date | null => {
  const rawValue = start?.dateTime ?? start?.date;
  if (!rawValue) return null;
  const date = parseGoogleDate(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * イベントの所要時間（分）を計算する。
 * 終日イベントは 60 分とみなす。
 */
const parseEventMinutes = (
  startsAt: Date,
  end: GCalRawIncrementalEvent["end"],
): number => {
  // 終日イベント（date のみ、dateTime なし）
  if (end?.date && !end.dateTime) return 60;

  const rawEnd = end?.dateTime ?? end?.date;
  if (!rawEnd) return 30;

  const endsAt = parseGoogleDate(rawEnd);
  if (Number.isNaN(endsAt.getTime())) return 30;

  return Math.max(15, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000));
};

/**
 * API レスポンスの生イベントを GoogleCalendarEvent 形式に変換する。
 * status: "cancelled" のイベントは変換不可能なので null を返す。
 */
const toCalendarEvent = (
  raw: GCalRawIncrementalEvent,
  calendarId: string,
  accentColor: string,
): GoogleCalendarEvent | null => {
  if (raw.status === "cancelled") return null;
  if (!raw.id) return null;

  const startsAt = parseEventStart(raw.start);
  if (!startsAt) return null;

  const isAllDay = Boolean(raw.start?.date && !raw.start?.dateTime);

  return {
    id: `${calendarId}:${raw.id}`,
    calendarId,
    accentColor,
    title: raw.summary || "(No title)",
    startsAt,
    minutes: parseEventMinutes(startsAt, raw.end),
    isAllDay,
  };
};

// ─────────────────────────────────────────────────────────────
// GoogleCalendarSyncEngine クラス
// ─────────────────────────────────────────────────────────────

export class GoogleCalendarSyncEngine {
  // ── エンジンオプション（コンストラクタで受け取る）
  private readonly options: Required<
    Pick<GCalSyncEngineOptions, "pollIntervalMs" | "fullSyncPastDays" | "fullSyncFutureDays">
  > &
    GCalSyncEngineOptions;

  // ── 実行時コンテキスト（start() で設定）
  private context: GCalSyncStartContext | null = null;

  // ── 状態管理
  private syncState: GCalSyncState = "idle";
  private lastSyncedAt: Date | null = null;
  private syncTokenMap: GCalSyncTokenMap = {};
  private isRunning = false;
  private currentBackoffMs = INITIAL_BACKOFF_MS;

  // ── タイマー
  private pollTimerId: ReturnType<typeof setTimeout> | null = null;

  // ── インフライトな同期処理（重複実行防止）
  private isSyncing = false;

  // ── イベント可視性リスナー（クリーンアップ用）
  private visibilityChangeListener: (() => void) | null = null;

  constructor(options: GCalSyncEngineOptions) {
    this.options = {
      pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      fullSyncPastDays: DEFAULT_FULL_SYNC_PAST_DAYS,
      fullSyncFutureDays: DEFAULT_FULL_SYNC_FUTURE_DAYS,
      ...options,
    };

    // localStorage から syncToken を復元（アプリ再起動時に再利用）
    this.syncTokenMap = readSyncTokens();
  }

  // ──────────────────────────────────────────────────────────
  // 公開 API
  // ──────────────────────────────────────────────────────────

  /**
   * 同期エンジンを起動する。
   * すでに起動中の場合は一度停止してから再起動する。
   */
  start(context: GCalSyncStartContext): void {
    this.stop();

    this.context = context;
    this.isRunning = true;
    this.currentBackoffMs = INITIAL_BACKOFF_MS;

    // ウィンドウ可視性の変化を監視
    this.visibilityChangeListener = this.handleVisibilityChange.bind(this);
    document.addEventListener(
      "visibilitychange",
      this.visibilityChangeListener,
    );

    // 即時に最初の同期を実行
    void this.runSync();
  }

  /**
   * 同期エンジンを停止する。
   * ポーリングタイマーをクリアし、イベントリスナーを解除する。
   */
  stop(): void {
    this.isRunning = false;
    this.clearPollTimer();
    this.context = null;

    if (this.visibilityChangeListener) {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityChangeListener,
      );
      this.visibilityChangeListener = null;
    }

    this.setSyncState("idle");
  }

  /**
   * 手動での強制同期（UI からの「今すぐ同期」ボタン等に対応）。
   * 実行中のタイマーをリセットして即時同期する。
   */
  async forceSync(): Promise<void> {
    this.clearPollTimer();
    await this.runSync();
  }

  /**
   * 指定カレンダーの syncToken をリセットする。
   * カレンダーの選択が変わった際に呼ぶ。
   */
  resetSyncTokensForCalendars(calendarIds: string[]): void {
    for (const id of calendarIds) {
      delete this.syncTokenMap[id];
    }
    writeSyncTokens(this.syncTokenMap);
  }

  /** 全 syncToken をクリア（切断時に呼ぶ） */
  clearAllSyncTokens(): void {
    this.syncTokenMap = {};
    writeSyncTokens(this.syncTokenMap);
  }

  // ──────────────────────────────────────────────────────────
  // 内部実装
  // ──────────────────────────────────────────────────────────

  /** ポーリングタイマーをクリアする */
  private clearPollTimer(): void {
    if (this.pollTimerId !== null) {
      clearTimeout(this.pollTimerId);
      this.pollTimerId = null;
    }
  }

  /** 同期状態を更新し、コールバックを呼び出す */
  private setSyncState(state: GCalSyncState): void {
    this.syncState = state;
    this.options.onSyncStateChange(state);
  }

  /**
   * ウィンドウのフォーカス/可視性が変化したときのハンドラ。
   * アクティブになったタイミングで即時同期を実行する。
   */
  private handleVisibilityChange(): void {
    if (!this.isRunning) return;

    if (document.visibilityState === "visible") {
      // フォーカス復帰時に即時同期
      this.clearPollTimer();
      void this.runSync();
    } else {
      // バックグラウンド移行時はタイマーを停止
      this.clearPollTimer();
    }
  }

  /**
   * メインの同期ループ。
   * - 対象カレンダーごとに syncToken の有無でフル同期/インクリメンタル同期を分岐
   * - 完了後に次回ポーリングをスケジュール
   */
  private async runSync(): Promise<void> {
    // 二重実行の防止
    if (this.isSyncing) return;
    if (!this.isRunning) return;
    if (!this.context) return;
    if (document.visibilityState !== "visible") return;

    const { accessToken, selectedCalendarIds, calendars } = this.context;

    this.isSyncing = true;
    this.setSyncState("syncing");

    // カレンダー ID → カレンダー情報のマップ（色情報の取得に使用）
    const calendarMap = new Map<string, GoogleCalendarListItem>(
      calendars.map((c) => [c.id, c]),
    );

    try {
      // 選択中のカレンダーを順次同期
      for (const calendarId of selectedCalendarIds) {
        if (!this.isRunning) break; // stop() が呼ばれたら中断

        const token = this.options.getAccessToken() ?? accessToken;
        const accentColor =
          calendarMap.get(calendarId)?.backgroundColor ?? "#185FA5";
        const existingSyncToken = this.syncTokenMap[calendarId];

        if (existingSyncToken) {
          // ── インクリメンタル同期
          await this.doIncrementalSync(calendarId, existingSyncToken, accentColor, token);
        } else {
          // ── フル同期（初回 or syncToken 失効後）
          await this.doFullSync(calendarId, accentColor, token);
        }
      }

      // 同期成功 → バックオフリセット・最終同期日時を更新
      this.currentBackoffMs = INITIAL_BACKOFF_MS;
      this.lastSyncedAt = new Date();
      this.options.onLastSyncedAtChange(this.lastSyncedAt);
      this.setSyncState("idle");

      // 次回ポーリングをスケジュール
      this.schedulePoll(this.options.pollIntervalMs);
    } catch (error) {
      console.error("[GCalSyncEngine] 同期エラー:", error);

      const isUnauthorized =
        error instanceof Error &&
        (error as Error & { status?: number }).status === 401;

      if (isUnauthorized) {
        // 401 → サイレント再接続を試みてリトライ
        const reconnected = await this.options.silentReconnect();
        if (reconnected && this.isRunning) {
          // 再接続成功 → 即時リトライ
          this.isSyncing = false;
          void this.runSync();
          return;
        }
      }

      // エラー状態に遷移し、バックオフ後にリトライ
      this.setSyncState("error");
      this.options.onError(
        error instanceof Error ? error : new Error(String(error)),
      );

      const backoffMs = this.currentBackoffMs;
      this.currentBackoffMs = Math.min(
        this.currentBackoffMs * 2,
        MAX_BACKOFF_MS,
      );
      this.schedulePoll(backoffMs);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 次回ポーリングをスケジュールする。
   * バックグラウンド時はスケジュールしない。
   */
  private schedulePoll(delayMs: number): void {
    if (!this.isRunning) return;
    if (document.visibilityState !== "visible") return;

    this.clearPollTimer();
    this.pollTimerId = setTimeout(() => {
      this.pollTimerId = null;
      void this.runSync();
    }, delayMs);
  }

  /**
   * フル同期を実行する。
   * 指定カレンダーの全イベントを取得し、nextSyncToken を保存する。
   */
  private async doFullSync(
    calendarId: string,
    accentColor: string,
    accessToken: string,
  ): Promise<void> {
    const now = new Date();
    const timeMin = subDays(now, this.options.fullSyncPastDays).toISOString();
    const timeMax = addDays(now, this.options.fullSyncFutureDays).toISOString();

    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin,
      timeMax,
    });

    const encodedId = encodeURIComponent(calendarId);
    let pageToken: string | undefined;
    const allEvents: GCalRawIncrementalEvent[] = [];
    let syncToken: string | undefined;

    // ── ページネーションで全件取得
    do {
      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const url = `${GCAL_API_BASE}/calendars/${encodedId}/events?${params.toString()}`;
      const response = await gcalGet<GCalEventsListResponse>(accessToken, url);

      allEvents.push(...(response.items ?? []));
      pageToken = response.nextPageToken;
      syncToken = response.nextSyncToken ?? syncToken;
    } while (pageToken);

    // syncToken を保存
    if (syncToken) {
      this.syncTokenMap[calendarId] = syncToken;
      writeSyncTokens(this.syncTokenMap);
    }

    // 全件をコールバックに通知（追加として扱う）
    for (const raw of allEvents) {
      const event = toCalendarEvent(raw, calendarId, accentColor);
      if (event) {
        this.options.onEventAdded(event);
      }
    }
  }

  /**
   * インクリメンタル同期を実行する。
   * syncToken を使って差分のみ取得し、追加/更新/削除を通知する。
   *
   * 410 Gone が返った場合は syncToken を破棄してフル同期にフォールバックする。
   */
  private async doIncrementalSync(
    calendarId: string,
    syncToken: string,
    accentColor: string,
    accessToken: string,
  ): Promise<void> {
    const encodedId = encodeURIComponent(calendarId);
    const params = new URLSearchParams({
      syncToken,
    });

    let pageToken: string | undefined;
    const diffEvents: GCalRawIncrementalEvent[] = [];
    let nextSyncToken: string | undefined;

    try {
      // ── ページネーションで差分全件取得
      do {
        if (pageToken) {
          params.set("pageToken", pageToken);
        }

        const url = `${GCAL_API_BASE}/calendars/${encodedId}/events?${params.toString()}`;
        const response = await gcalGet<GCalEventsListResponse>(
          accessToken,
          url,
        );

        diffEvents.push(...(response.items ?? []));
        pageToken = response.nextPageToken;
        nextSyncToken = response.nextSyncToken ?? nextSyncToken;
      } while (pageToken);
    } catch (error) {
      const is410 =
        error instanceof Error &&
        (error as Error & { status?: number }).status === 410;

      if (is410) {
        // syncToken が期限切れ → フル同期にフォールバック
        console.info(
          `[GCalSyncEngine] syncToken 失効（410 Gone）: calendarId=${calendarId} → フル同期へ`,
        );
        delete this.syncTokenMap[calendarId];
        writeSyncTokens(this.syncTokenMap);
        await this.doFullSync(calendarId, accentColor, accessToken);
        return;
      }

      throw error;
    }

    // 新しい syncToken を保存
    if (nextSyncToken) {
      this.syncTokenMap[calendarId] = nextSyncToken;
      writeSyncTokens(this.syncTokenMap);
    }

    // 差分を処理：削除/更新/追加を振り分けてコールバック呼び出し
    this.applyDiff(calendarId, accentColor, diffEvents);
  }

  /**
   * 差分イベントリストを処理し、追加/更新/削除コールバックを呼び出す。
   *
   * @param calendarId 対象カレンダー ID
   * @param accentColor カレンダーのアクセントカラー
   * @param rawEvents API から返された差分イベント
   */
  private applyDiff(
    calendarId: string,
    accentColor: string,
    rawEvents: GCalRawIncrementalEvent[],
  ): void {
    for (const raw of rawEvents) {
      if (!raw.id) continue;

      const compositeId = `${calendarId}:${raw.id}`;

      if (raw.status === "cancelled") {
        // ── 削除
        this.options.onEventDeleted(compositeId);
        continue;
      }

      const event = toCalendarEvent(raw, calendarId, accentColor);
      if (!event) continue;

      // 追加と更新はコールバック側で id の存在確認を行う。
      // エンジン側では「更新」として扱い、コールバック側が state を調整する。
      this.options.onEventUpdated(event);
    }
  }
}
