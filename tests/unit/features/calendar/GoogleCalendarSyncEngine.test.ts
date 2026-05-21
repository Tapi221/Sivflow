import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleCalendarSyncEngine } from "../../../../src/features/calendar/googlecalendar-sync/GoogleCalendarSyncEngine";
import type { GCalSyncEngineOptions, GCalSyncStartContext, GoogleCalendarListItem } from "../../../../src/features/calendar/googlecalendar-integration/gcalSync.types";

// ─────────────────────────────────────────────────────────────
// テスト用定数
// ─────────────────────────────────────────────────────────────

const CALENDAR_ID = "primary";
const ACCENT_COLOR = "#4285f4";
const ACCESS_TOKEN = "test-access-token";

/** テスト用カレンダーリスト */
const testCalendars: GoogleCalendarListItem[] = [
  {
    id: CALENDAR_ID,
    summary: "Primary Calendar",
    backgroundColor: ACCENT_COLOR,
    primary: true,
    selected: true,
  },
];

/** テスト用コンテキスト */
const testContext: GCalSyncStartContext = {
  accessToken: ACCESS_TOKEN,
  selectedCalendarIds: new Set([CALENDAR_ID]),
  calendars: testCalendars,
};

// ─────────────────────────────────────────────────────────────
// モックヘルパー
// ─────────────────────────────────────────────────────────────

/**
 * Google Calendar API の events.list レスポンスをモックする。
 * @param items イベント配列
 * @param nextSyncToken 次回インクリメンタル同期に使う syncToken
 */
const mockEventsListResponse = (
  items: object[] = [],
  nextSyncToken = "sync-token-1",
) =>
  Promise.resolve(
    new Response(JSON.stringify({ items, nextSyncToken }), { status: 200 }),
  );

/** 401 Unauthorized レスポンスをモックする */
const mock401Response = () =>
  Promise.resolve(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  );

/** 410 Gone レスポンスをモックする（syncToken 失効） */
const mock410Response = () =>
  Promise.resolve(
    new Response(JSON.stringify({ error: "Gone" }), { status: 410 }),
  );

// ─────────────────────────────────────────────────────────────
// document.visibilityState を "visible" に固定（jsdom はデフォルト "visible"）
// ─────────────────────────────────────────────────────────────

Object.defineProperty(document, "visibilityState", {
  configurable: true,
  get: () => "visible",
});

// ─────────────────────────────────────────────────────────────
// テスト
// ─────────────────────────────────────────────────────────────

describe("GoogleCalendarSyncEngine", () => {
  let onEventAdded: ReturnType<typeof vi.fn>;
  let onEventUpdated: ReturnType<typeof vi.fn>;
  let onEventDeleted: ReturnType<typeof vi.fn>;
  let onSyncStateChange: ReturnType<typeof vi.fn>;
  let onLastSyncedAtChange: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let silentReconnect: ReturnType<typeof vi.fn>;
  let getAccessToken: ReturnType<typeof vi.fn>;
  let engine: GoogleCalendarSyncEngine;

  /** エンジンを標準オプションで生成するヘルパー */
  const buildEngine = () =>
    new GoogleCalendarSyncEngine({
      onEventAdded,
      onEventUpdated,
      onEventDeleted,
      onSyncStateChange,
      onLastSyncedAtChange,
      onError,
      silentReconnect,
      getAccessToken,
      // テスト中はポーリングタイマーを起動しない（手動で forceSync を呼ぶ）
      pollIntervalMs: 999_999,
    } satisfies GCalSyncEngineOptions);

  beforeEach(() => {
    onEventAdded = vi.fn();
    onEventUpdated = vi.fn();
    onEventDeleted = vi.fn();
    onSyncStateChange = vi.fn();
    onLastSyncedAtChange = vi.fn();
    onError = vi.fn();
    silentReconnect = vi.fn().mockResolvedValue(true);
    getAccessToken = vi.fn().mockReturnValue(ACCESS_TOKEN);

    // jsdom の localStorage をリセット
    localStorage.clear();
    vi.restoreAllMocks();

    engine = buildEngine();
  });

  // ─────────────────────────────────────────────────────────
  // フル同期（syncToken なし）
  // ─────────────────────────────────────────────────────────

  describe("フル同期（初回）", () => {
    it("syncToken がない場合、フル同期を実行して onEventAdded を呼ぶ", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(
        mockEventsListResponse(
          [
            {
              id: "event-1",
              summary: "ミーティング",
              status: "confirmed",
              start: { dateTime: "2026-05-18T10:00:00+09:00" },
              end: { dateTime: "2026-05-18T11:00:00+09:00" },
            },
            {
              id: "event-2",
              summary: "ランチ",
              status: "confirmed",
              start: { dateTime: "2026-05-18T12:00:00+09:00" },
              end: { dateTime: "2026-05-18T13:00:00+09:00" },
            },
          ],
          "initial-sync-token",
        ),
      );

      engine.start(testContext);
      // 非同期処理が完了するまで複数 tick 待つ
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      engine.stop();

      // フル同期で fetch が 1 回呼ばれる
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // 2 件のイベントが追加コールバックで通知される
      expect(onEventAdded).toHaveBeenCalledTimes(2);
      expect(onEventAdded.mock.calls[0][0]).toMatchObject({
        id: `${CALENDAR_ID}:event-1`,
        title: "ミーティング",
        calendarId: CALENDAR_ID,
      });

      // syncToken が localStorage に保存される
      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      expect(stored).not.toBeNull();
      const tokenMap = JSON.parse(stored!) as Record<string, string>;
      expect(tokenMap[CALENDAR_ID]).toBe("initial-sync-token");
    });

    it("status: 'cancelled' のイベントは onEventAdded を呼ばない", async () => {
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        mockEventsListResponse(
          [{ id: "event-deleted", status: "cancelled" }],
          "token-after-cancel",
        ),
      );

      engine.start(testContext);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      engine.stop();

      expect(onEventAdded).not.toHaveBeenCalled();
      expect(onEventDeleted).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // インクリメンタル同期（syncToken あり）
  // ─────────────────────────────────────────────────────────

  describe("インクリメンタル同期（syncToken あり）", () => {
    beforeEach(() => {
      // syncToken を事前に localStorage に設定
      localStorage.setItem(
        "flashcard-master.gcal.sync_tokens",
        JSON.stringify({ [CALENDAR_ID]: "existing-sync-token" }),
      );
      // コンストラクタで localStorage を読むため再生成する
      engine = buildEngine();
    });

    it("変更イベントで onEventUpdated が呼ばれる", async () => {
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        mockEventsListResponse(
          [
            {
              id: "event-1",
              summary: "ミーティング（更新）",
              status: "confirmed",
              start: { dateTime: "2026-05-18T14:00:00+09:00" },
              end: { dateTime: "2026-05-18T15:00:00+09:00" },
            },
          ],
          "next-sync-token",
        ),
      );

      engine.start(testContext);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      engine.stop();

      // インクリメンタル同期では onEventUpdated が呼ばれる
      expect(onEventUpdated).toHaveBeenCalledTimes(1);
      expect(onEventUpdated.mock.calls[0][0]).toMatchObject({
        id: `${CALENDAR_ID}:event-1`,
        title: "ミーティング（更新）",
      });

      // 新しい syncToken が保存される
      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      const tokenMap = JSON.parse(stored!) as Record<string, string>;
      expect(tokenMap[CALENDAR_ID]).toBe("next-sync-token");
    });

    it("status: 'cancelled' のイベントで onEventDeleted が呼ばれる", async () => {
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        mockEventsListResponse(
          [{ id: "event-to-delete", status: "cancelled" }],
          "after-delete-token",
        ),
      );

      engine.start(testContext);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      engine.stop();

      // 削除コールバックが複合 ID で呼ばれる
      expect(onEventDeleted).toHaveBeenCalledTimes(1);
      expect(onEventDeleted).toHaveBeenCalledWith(
        `${CALENDAR_ID}:event-to-delete`,
      );
      expect(onEventAdded).not.toHaveBeenCalled();
      expect(onEventUpdated).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 410 Gone → フル同期フォールバック
  // ─────────────────────────────────────────────────────────

  describe("410 Gone → フル同期フォールバック", () => {
    beforeEach(() => {
      localStorage.setItem(
        "flashcard-master.gcal.sync_tokens",
        JSON.stringify({ [CALENDAR_ID]: "expired-sync-token" }),
      );
      engine = buildEngine();
    });

    it("410 が返ったとき syncToken をクリアしてフル同期を実行する", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        // 1 回目：インクリメンタル同期 → 410
        .mockReturnValueOnce(mock410Response())
        // 2 回目：フル同期 → 成功
        .mockReturnValueOnce(
          mockEventsListResponse(
            [
              {
                id: "full-sync-event",
                summary: "フル同期イベント",
                status: "confirmed",
                start: { dateTime: "2026-05-18T09:00:00+09:00" },
                end: { dateTime: "2026-05-18T10:00:00+09:00" },
              },
            ],
            "fresh-sync-token",
          ),
        );

      engine.start(testContext);
      // 410 → フル同期の非同期チェーンが完了するまで待つ
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      engine.stop();

      // fetch は 2 回呼ばれる（インクリメンタル→410→フル同期）
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // フル同期で onEventAdded が呼ばれる
      expect(onEventAdded).toHaveBeenCalledTimes(1);
      expect(onEventAdded.mock.calls[0][0]).toMatchObject({
        id: `${CALENDAR_ID}:full-sync-event`,
      });

      // 新しい syncToken が保存される
      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      const tokenMap = JSON.parse(stored!) as Record<string, string>;
      expect(tokenMap[CALENDAR_ID]).toBe("fresh-sync-token");
    });
  });

  // ─────────────────────────────────────────────────────────
  // 401 → サイレント再接続
  // ─────────────────────────────────────────────────────────

  describe("401 Unauthorized → サイレント再接続", () => {
    it("401 が返ったとき silentReconnect を呼ぶ", async () => {
      vi.spyOn(globalThis, "fetch").mockReturnValue(mock401Response());

      engine.start(testContext);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      engine.stop();

      expect(silentReconnect).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // stop()
  // ─────────────────────────────────────────────────────────

  describe("stop()", () => {
    it("stop() 後は同期状態が idle になる", async () => {
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        mockEventsListResponse([], "token"),
      );

      engine.start(testContext);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      engine.stop();

      const calls = onSyncStateChange.mock.calls.map((c) => c[0] as string);
      expect(calls.at(-1)).toBe("idle");
    });
  });

  // ─────────────────────────────────────────────────────────
  // clearAllSyncTokens()
  // ─────────────────────────────────────────────────────────

  describe("clearAllSyncTokens()", () => {
    it("clearAllSyncTokens() 後は localStorage の syncToken が空になる", () => {
      localStorage.setItem(
        "flashcard-master.gcal.sync_tokens",
        JSON.stringify({ [CALENDAR_ID]: "some-token" }),
      );
      // コンストラクタでトークンを読み込ませる
      engine = buildEngine();

      engine.clearAllSyncTokens();

      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      expect(JSON.parse(stored ?? "{}")).toEqual({});
    });
  });
});