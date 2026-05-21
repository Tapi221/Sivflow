// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleCalendarSyncEngine } from "../../../../src/features/calendar/googlecalendar-sync/GoogleCalendarSyncEngine";
import type { GCalSyncEngineOptions, GCalSyncStartContext, GCalSyncState, GoogleCalendarEvent, GoogleCalendarListItem } from "../../../../src/features/calendar/googlecalendar-integration/gcalSync.types";

const CALENDAR_ID = "primary";
const ACCENT_COLOR = "#4285f4";
const ACCESS_TOKEN = "test-access-token";

const testCalendars: GoogleCalendarListItem[] = [
  {
    id: CALENDAR_ID,
    summary: "Primary Calendar",
    backgroundColor: ACCENT_COLOR,
    primary: true,
    selected: true,
  },
];

const testContext: GCalSyncStartContext = {
  accessToken: ACCESS_TOKEN,
  selectedCalendarIds: new Set([CALENDAR_ID]),
  calendars: testCalendars,
};

const mockEventsListResponse = (
  items: object[] = [],
  nextSyncToken = "sync-token-1",
) =>
  Promise.resolve(
    new Response(JSON.stringify({ items, nextSyncToken }), { status: 200 }),
  );

const mock401Response = () =>
  Promise.resolve(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  );

const mock410Response = () =>
  Promise.resolve(
    new Response(JSON.stringify({ error: "Gone" }), { status: 410 }),
  );

Object.defineProperty(document, "visibilityState", {
  configurable: true,
  get: () => "visible",
});

describe("GoogleCalendarSyncEngine", () => {
  let onEventAdded: ReturnType<typeof vi.fn<(event: GoogleCalendarEvent) => void>>;
  let onEventUpdated: ReturnType<typeof vi.fn<(event: GoogleCalendarEvent) => void>>;
  let onEventDeleted: ReturnType<typeof vi.fn<(compositeId: string) => void>>;
  let onEventsRangeReplaced: ReturnType<
    typeof vi.fn<
      (input: {
        calendarId: string;
        rangeStart: Date;
        rangeEnd: Date;
        events: GoogleCalendarEvent[];
      }) => void
    >
  >;
  let onSyncStateChange: ReturnType<typeof vi.fn<(state: GCalSyncState) => void>>;
  let onLastSyncedAtChange: ReturnType<typeof vi.fn<(at: Date) => void>>;
  let onError: ReturnType<typeof vi.fn<(error: Error) => void>>;
  let silentReconnect: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
  let getAccessToken: ReturnType<typeof vi.fn<() => string | null>>;
  let engine: GoogleCalendarSyncEngine;

  const buildEngine = (accountId?: string) =>
    new GoogleCalendarSyncEngine({
      accountId,
      onEventAdded,
      onEventUpdated,
      onEventDeleted,
      onEventsRangeReplaced,
      onSyncStateChange,
      onLastSyncedAtChange,
      onError,
      silentReconnect,
      getAccessToken,
      pollIntervalMs: 999_999,
    } satisfies GCalSyncEngineOptions);

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    onEventAdded = vi.fn<(event: GoogleCalendarEvent) => void>();
    onEventUpdated = vi.fn<(event: GoogleCalendarEvent) => void>();
    onEventDeleted = vi.fn<(compositeId: string) => void>();
    onEventsRangeReplaced = vi.fn();
    onSyncStateChange = vi.fn<(state: GCalSyncState) => void>();
    onLastSyncedAtChange = vi.fn<(at: Date) => void>();
    onError = vi.fn<(error: Error) => void>();
    silentReconnect = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    getAccessToken = vi.fn<() => string | null>().mockReturnValue(ACCESS_TOKEN);

    engine = buildEngine();
  });

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

      await vi.waitFor(() => {
        expect(onEventAdded).toHaveBeenCalledTimes(2);
      });

      engine.stop();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onEventAdded.mock.calls[0][0]).toMatchObject({
        id: `${CALENDAR_ID}:event-1`,
        title: "ミーティング",
        calendarId: CALENDAR_ID,
      });

      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      expect(stored).not.toBeNull();

      const tokenMap = JSON.parse(stored!) as Record<string, string>;
      expect(tokenMap[CALENDAR_ID]).toBe("initial-sync-token");
    });

    it("status: 'cancelled' のイベントは onEventAdded を呼ばない", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(
        mockEventsListResponse(
          [{ id: "event-deleted", status: "cancelled" }],
          "token-after-cancel",
        ),
      );

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      engine.stop();

      expect(onEventAdded).not.toHaveBeenCalled();
      expect(onEventDeleted).not.toHaveBeenCalled();
    });
  });

  describe("インクリメンタル同期（syncToken あり）", () => {
    it("変更イベントで onEventUpdated が呼ばれる", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockReturnValueOnce(mockEventsListResponse([], "existing-sync-token"))
        .mockReturnValueOnce(
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

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      document.dispatchEvent(new Event("visibilitychange"));

      await vi.waitFor(() => {
        expect(onEventUpdated).toHaveBeenCalledTimes(1);
      });

      engine.stop();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(onEventUpdated.mock.calls[0][0]).toMatchObject({
        id: `${CALENDAR_ID}:event-1`,
        title: "ミーティング（更新）",
      });

      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      const tokenMap = JSON.parse(stored!) as Record<string, string>;
      expect(tokenMap[CALENDAR_ID]).toBe("next-sync-token");
    });

    it("status: 'cancelled' のイベントで onEventDeleted が呼ばれる", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockReturnValueOnce(mockEventsListResponse([], "existing-sync-token"))
        .mockReturnValueOnce(
          mockEventsListResponse(
            [{ id: "event-to-delete", status: "cancelled" }],
            "after-delete-token",
          ),
        );

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      document.dispatchEvent(new Event("visibilitychange"));

      await vi.waitFor(() => {
        expect(onEventDeleted).toHaveBeenCalledTimes(1);
      });

      engine.stop();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(onEventDeleted).toHaveBeenCalledWith(
        `${CALENDAR_ID}:event-to-delete`,
      );
      expect(onEventAdded).not.toHaveBeenCalled();
      expect(onEventUpdated).not.toHaveBeenCalled();
    });
  });

  describe("410 Gone → フル同期フォールバック", () => {
    it("410 が返ったとき syncToken をクリアしてフル同期を実行する", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockReturnValueOnce(mockEventsListResponse([], "expired-sync-token"))
        .mockReturnValueOnce(mock410Response())
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

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      document.dispatchEvent(new Event("visibilitychange"));

      await vi.waitFor(() => {
        expect(onEventAdded).toHaveBeenCalledTimes(1);
      });

      engine.stop();

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(onEventAdded.mock.calls[0][0]).toMatchObject({
        id: `${CALENDAR_ID}:full-sync-event`,
      });

      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      const tokenMap = JSON.parse(stored!) as Record<string, string>;
      expect(tokenMap[CALENDAR_ID]).toBe("fresh-sync-token");
    });
  });

  describe("401 Unauthorized → サイレント再接続", () => {
    it("401 が返ったとき silentReconnect を呼ぶ", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockReturnValueOnce(mock401Response())
        .mockReturnValueOnce(mockEventsListResponse([], "after-reconnect-token"));

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(silentReconnect).toHaveBeenCalled();
      });

      engine.stop();
    });

    it("サイレント再接続できない場合は needsReconnect になる", async () => {
      silentReconnect.mockResolvedValue(false);

      vi.spyOn(globalThis, "fetch").mockReturnValueOnce(mock401Response());

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(onSyncStateChange).toHaveBeenCalledWith("needsReconnect");
      });

      engine.stop();
    });
  });

  describe("表示範囲ベースの forceSync", () => {
    it("rangeStart/rangeEnd を指定した範囲で events.list を実行する", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockReturnValueOnce(mockEventsListResponse([], "initial-token"))
        .mockReturnValueOnce(mockEventsListResponse([], "range-token"));

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const rangeStart = new Date("2028-01-01T00:00:00.000Z");
      const rangeEnd = new Date("2028-02-01T00:00:00.000Z");

      await engine.forceSyncRange({ rangeStart, rangeEnd });

      engine.stop();

      expect(fetchMock).toHaveBeenCalledTimes(2);

      const rangeUrl = new URL(String(fetchMock.mock.calls[1][0]));

      expect(rangeUrl.searchParams.get("timeMin")).toBe(
        rangeStart.toISOString(),
      );
      expect(rangeUrl.searchParams.get("timeMax")).toBe(rangeEnd.toISOString());

      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      const tokenMap = JSON.parse(stored!) as Record<string, string>;
      expect(tokenMap[CALENDAR_ID]).toBe("initial-token");
    });

    it("range sync 後、API に存在しない古いイベントが削除される", async () => {
      const eventState = new Map<string, GoogleCalendarEvent>();
      const staleEvent: GoogleCalendarEvent = {
        id: `${CALENDAR_ID}:stale-event`,
        calendarId: CALENDAR_ID,
        accentColor: ACCENT_COLOR,
        title: "削除済み予定",
        startsAt: new Date("2028-01-10T10:00:00.000Z"),
        endsAt: new Date("2028-01-10T11:00:00.000Z"),
        isAllDay: false,
      };

      eventState.set(staleEvent.id, staleEvent);

      onEventsRangeReplaced.mockImplementation(
        ({ calendarId, rangeStart, rangeEnd, events }) => {
          for (const [eventId, event] of eventState) {
            if (
              event.calendarId === calendarId &&
              event.startsAt < rangeEnd &&
              event.endsAt > rangeStart
            ) {
              eventState.delete(eventId);
            }
          }

          for (const event of events) {
            eventState.set(event.id, event);
          }
        },
      );

      vi.spyOn(globalThis, "fetch")
        .mockReturnValueOnce(mockEventsListResponse([], "initial-token"))
        .mockReturnValueOnce(
          mockEventsListResponse(
            [
              {
                id: "fresh-event",
                summary: "残る予定",
                status: "confirmed",
                start: { dateTime: "2028-01-12T10:00:00Z" },
                end: { dateTime: "2028-01-12T11:00:00Z" },
              },
            ],
            "range-token",
          ),
        );

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(onLastSyncedAtChange).toHaveBeenCalledTimes(1);
      });

      await engine.forceSyncRange({
        rangeStart: new Date("2028-01-01T00:00:00.000Z"),
        rangeEnd: new Date("2028-02-01T00:00:00.000Z"),
      });

      engine.stop();

      expect(eventState.has(staleEvent.id)).toBe(false);
      expect(eventState.has(`${CALENDAR_ID}:fresh-event`)).toBe(true);
    });

    it("forceSyncRange 後の polling が不要な full sync にならない", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockReturnValueOnce(mockEventsListResponse([], "initial-token"))
        .mockReturnValueOnce(mockEventsListResponse([], "range-token"))
        .mockReturnValueOnce(mockEventsListResponse([], "next-token"));

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      await engine.forceSyncRange({
        rangeStart: new Date("2028-01-01T00:00:00.000Z"),
        rangeEnd: new Date("2028-02-01T00:00:00.000Z"),
      });

      document.dispatchEvent(new Event("visibilitychange"));

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });

      engine.stop();

      const pollingUrl = new URL(String(fetchMock.mock.calls[2][0]));

      expect(pollingUrl.searchParams.get("syncToken")).toBe("initial-token");
      expect(pollingUrl.searchParams.has("timeMin")).toBe(false);
    });

    it("lastSyncedAt が同期完了時に反映される", async () => {
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        mockEventsListResponse([], "token"),
      );

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(onLastSyncedAtChange).toHaveBeenCalled();
      });

      engine.stop();

      expect(onLastSyncedAtChange.mock.calls[0][0]).toBeInstanceOf(Date);
    });

    it("複数 account で同じ calendarId を持っても syncToken が衝突しない", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockReturnValueOnce(mockEventsListResponse([], "account-a-token"))
        .mockReturnValueOnce(mockEventsListResponse([], "account-b-token"));

      const accountAEngine = buildEngine("account-a");
      const accountBEngine = buildEngine("account-b");

      accountAEngine.start(testContext);

      await vi.waitFor(() => {
        const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
        const tokenMap = JSON.parse(stored ?? "{}") as Record<string, string>;

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(tokenMap["account-a:primary"]).toBe("account-a-token");
      });

      accountAEngine.stop();

      accountBEngine.start({
        ...testContext,
        accessToken: "account-b-access-token",
      });

      await vi.waitFor(() => {
        const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
        const tokenMap = JSON.parse(stored ?? "{}") as Record<string, string>;

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(tokenMap["account-b:primary"]).toBe("account-b-token");
      });

      accountBEngine.stop();

      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      const tokenMap = JSON.parse(stored!) as Record<string, string>;

      expect(tokenMap["account-a:primary"]).toBe("account-a-token");
      expect(tokenMap["account-b:primary"]).toBe("account-b-token");
      expect(tokenMap.primary).toBeUndefined();
    });
  });

  describe("stop()", () => {
    it("stop() 後は同期状態が idle になる", async () => {
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        mockEventsListResponse([], "token"),
      );

      engine.start(testContext);

      await vi.waitFor(() => {
        expect(onSyncStateChange).toHaveBeenCalledWith("syncing");
      });

      engine.stop();

      const calls = onSyncStateChange.mock.calls.map((c) => c[0] as string);
      expect(calls.at(-1)).toBe("idle");
    });
  });

  describe("clearAllSyncTokens()", () => {
    it("clearAllSyncTokens() 後は localStorage の syncToken が空になる", () => {
      localStorage.setItem(
        "flashcard-master.gcal.sync_tokens",
        JSON.stringify({ [CALENDAR_ID]: "some-token" }),
      );

      engine = buildEngine();
      engine.clearAllSyncTokens();

      const stored = localStorage.getItem("flashcard-master.gcal.sync_tokens");
      expect(JSON.parse(stored ?? "{}")).toEqual({});
    });
  });
});
