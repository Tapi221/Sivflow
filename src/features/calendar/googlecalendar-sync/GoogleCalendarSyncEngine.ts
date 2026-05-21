import { addDays, subDays } from "date-fns";

import type {
  GCalEventsListResponse,
  GCalForceSyncOptions,
  GCalRawIncrementalEvent,
  GCalSyncRange,
  GCalSyncEngineOptions,
  GCalSyncStartContext,
  GCalSyncState,
  GCalSyncTokenMap,
  GoogleCalendarEvent,
} from "../googlecalendar-integration/gcalSync.types";

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";

const SYNC_TOKENS_STORAGE_KEY = "flashcard-master.gcal.sync_tokens";

const DEFAULT_POLL_INTERVAL_MS = 60_000;

const MAX_BACKOFF_MS = 10 * 60 * 1000;

const INITIAL_BACKOFF_MS = 60_000;

// UI依存を完全排除した固定範囲
const DEFAULT_FULL_SYNC_PAST_DAYS = 365;
const DEFAULT_FULL_SYNC_FUTURE_DAYS = 365;

// ─────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────

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

const writeSyncTokens = (map: GCalSyncTokenMap): void => {
  try {
    localStorage.setItem(SYNC_TOKENS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const buildSyncTokenKey = (accountId: string | undefined, calendarId: string) =>
  accountId ? `${accountId}:${calendarId}` : calendarId;

const buildCompositeEventId = (
  accountId: string | undefined,
  calendarId: string,
  eventId: string,
) =>
  accountId ? `${accountId}:${calendarId}:${eventId}` : `${calendarId}:${eventId}`;

const mergeWriteSyncTokens = (map: GCalSyncTokenMap): GCalSyncTokenMap => {
  const next = {
    ...readSyncTokens(),
    ...map,
  };

  writeSyncTokens(next);

  return next;
};

// ─────────────────────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────────────────────

const gcalGet = async <T>(accessToken: string, url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = new Error(
      `Google Calendar API エラー (${response.status}): ${url}`,
    );

    (error as Error & { status: number }).status = response.status;

    throw error;
  }

  return (await response.json()) as T;
};

// ─────────────────────────────────────────────────────────────
// Date parser
// ─────────────────────────────────────────────────────────────

const parseGoogleDate = (rawValue: string): Date => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(rawValue);
};

const parseEventStart = (
  start: GCalRawIncrementalEvent["start"],
): Date | null => {
  const rawValue = start?.dateTime ?? start?.date;
  if (!rawValue) return null;

  const date = parseGoogleDate(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseEventEnd = (
  end: GCalRawIncrementalEvent["end"],
): Date | null => {
  const rawValue = end?.dateTime ?? end?.date;
  if (!rawValue) return null;

  const date = parseGoogleDate(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

// ─────────────────────────────────────────────────────────────
// Event transform
// ─────────────────────────────────────────────────────────────

const toCalendarEvent = (
  raw: GCalRawIncrementalEvent,
  calendarId: string,
  accentColor: string,
  accountId?: string,
): GoogleCalendarEvent | null => {
  if (raw.status === "cancelled") return null;
  if (!raw.id) return null;

  const startsAt = parseEventStart(raw.start);
  if (!startsAt) return null;

  const endsAt = parseEventEnd(raw.end);
  if (!endsAt) return null;

  return {
    id: buildCompositeEventId(accountId, calendarId, raw.id),
    calendarId,
    accentColor,
    title: raw.summary || "(No title)",
    startsAt,
    endsAt,
    isAllDay: Boolean(raw.start?.date && !raw.start?.dateTime),
  };
};

// ─────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────

export class GoogleCalendarSyncEngine {
  private readonly options: Required<
    Pick<
      GCalSyncEngineOptions,
      "pollIntervalMs" | "fullSyncPastDays" | "fullSyncFutureDays"
    >
  > &
    GCalSyncEngineOptions;

  private context: GCalSyncStartContext | null = null;

  private syncState: GCalSyncState = "idle";
  private lastSyncedAt: Date | null = null;

  private syncTokenMap: GCalSyncTokenMap = {};

  private isRunning = false;
  private isSyncing = false;
  private hasPendingSync = false;
  private pendingSyncRange: GCalSyncRange | null = null;
  private pendingSyncResolvers: Array<() => void> = [];

  private currentBackoffMs = INITIAL_BACKOFF_MS;

  private pollTimerId: ReturnType<typeof setTimeout> | null = null;

  private visibilityChangeListener: (() => void) | null = null;

  // 起動直後は必ずフル同期して、React state にイベント本体を復元する
  private isFullSyncAllowed = true;

  constructor(options: GCalSyncEngineOptions) {
    this.options = {
      pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      fullSyncPastDays: DEFAULT_FULL_SYNC_PAST_DAYS,
      fullSyncFutureDays: DEFAULT_FULL_SYNC_FUTURE_DAYS,
      ...options,
    };

    this.syncTokenMap = readSyncTokens();
  }

  // ─────────────────────────────────────────────
  // lifecycle
  // ─────────────────────────────────────────────

  start(context: GCalSyncStartContext): void {
    this.stop();

    this.context = context;
    this.isRunning = true;
    this.isFullSyncAllowed = true;

    this.currentBackoffMs = INITIAL_BACKOFF_MS;

    this.visibilityChangeListener = this.handleVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.visibilityChangeListener);

    void this.runSync();
  }

  stop(): void {
    this.isRunning = false;
    this.clearPollTimer();
    this.resolvePendingSync();
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

  updateContext(context: Partial<GCalSyncStartContext>): void {
    if (!this.context) return;

    this.context = {
      ...this.context,
      ...context,
    };
  }

  async forceSync(): Promise<void> {
    this.clearPollTimer();
    this.isFullSyncAllowed = true;
    await this.runSync();
  }

  async forceSyncRange(options: GCalForceSyncOptions): Promise<void> {
    const range = this.normalizeRange(options);

    if (!range) return;

    this.clearPollTimer();
    await this.runSync(range);
  }

  async ensureRange(rangeStart: Date, rangeEnd: Date): Promise<void> {
    await this.forceSyncRange({ rangeStart, rangeEnd });
  }

  clearAllSyncTokens(): void {
    this.syncTokenMap = {};
    writeSyncTokens(this.syncTokenMap);
  }

  // ─────────────────────────────────────────────
  // sync state
  // ─────────────────────────────────────────────

  private setSyncState(state: GCalSyncState): void {
    this.syncState = state;
    this.options.onSyncStateChange(state);
  }

  private clearPollTimer(): void {
    if (this.pollTimerId) {
      clearTimeout(this.pollTimerId);
      this.pollTimerId = null;
    }
  }

  private resolvePendingSync(): void {
    const resolvers = this.pendingSyncResolvers.splice(0);

    this.hasPendingSync = false;
    this.pendingSyncRange = null;

    for (const resolve of resolvers) {
      resolve();
    }
  }

  // ─────────────────────────────────────────────
  // visibility
  // ─────────────────────────────────────────────

  private handleVisibilityChange(): void {
    if (!this.isRunning) return;

    if (document.visibilityState === "visible") {
      this.clearPollTimer();

      // フォーカス復帰は軽い同期のみ
      this.isFullSyncAllowed = false;

      void this.runSync();
    } else {
      this.clearPollTimer();
    }
  }

  // ─────────────────────────────────────────────
  // main sync loop
  // ─────────────────────────────────────────────

  private normalizeRange(options: GCalForceSyncOptions): GCalSyncRange | null {
    if (!options.rangeStart || !options.rangeEnd) return null;

    return options.rangeStart <= options.rangeEnd
      ? {
          rangeStart: options.rangeStart,
          rangeEnd: options.rangeEnd,
        }
      : {
          rangeStart: options.rangeEnd,
          rangeEnd: options.rangeStart,
        };
  }

  private getDefaultFullSyncRange(): GCalSyncRange {
    const now = new Date();

    return {
      rangeStart: subDays(now, this.options.fullSyncPastDays),
      rangeEnd: addDays(now, this.options.fullSyncFutureDays),
    };
  }

  private async runSync(range: GCalSyncRange | null = null): Promise<void> {
    if (this.isSyncing) {
      this.hasPendingSync = true;
      this.pendingSyncRange = range ?? this.pendingSyncRange;
      return new Promise<void>((resolve) => {
        this.pendingSyncResolvers.push(resolve);
      });
    }
    if (!this.isRunning) return;
    if (!this.context) return;

    const { accessToken, selectedCalendarIds, calendars } = this.context;

    this.isSyncing = true;
    this.setSyncState("syncing");

    const calendarMap = new Map(calendars.map((c) => [c.id, c]));

    let shouldRetryAfterReconnect = false;

    try {
      for (const calendarId of selectedCalendarIds) {
        if (!this.isRunning) break;

        const token =
          this.options.getAccessToken?.() ??
          this.context?.accessToken ??
          accessToken;

        const accentColor =
          calendarMap.get(calendarId)?.backgroundColor ?? "#185FA5";

        const syncTokenKey = buildSyncTokenKey(
          this.options.accountId,
          calendarId,
        );
        const existingSyncToken = this.syncTokenMap[syncTokenKey];

        if (range) {
          await this.doFullSync(
            calendarId,
            accentColor,
            token,
            range,
            false,
          );
        } else if (existingSyncToken && !this.isFullSyncAllowed) {
          await this.doIncrementalSync(
            calendarId,
            existingSyncToken,
            accentColor,
            token,
          );
        } else {
          await this.doFullSync(
            calendarId,
            accentColor,
            token,
            this.getDefaultFullSyncRange(),
            true,
          );
          this.isFullSyncAllowed = false;
        }
      }

      this.currentBackoffMs = INITIAL_BACKOFF_MS;

      this.lastSyncedAt = new Date();
      this.options.onLastSyncedAtChange(this.lastSyncedAt);

      this.setSyncState("idle");
      this.schedulePoll(this.options.pollIntervalMs);
    } catch (error) {
      console.error("[GCalSyncEngine] sync error:", error);

      const isUnauthorized =
        error instanceof Error &&
        (error as Error & { status?: number }).status === 401;

      if (isUnauthorized) {
        const reconnected = await this.options.silentReconnect();

        if (reconnected && this.isRunning) {
          shouldRetryAfterReconnect = true;
          return;
        }

        this.setSyncState("needsReconnect");
        this.options.onError(new Error("Google Calendar の再連携が必要です"));
        return;
      }

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

      if (shouldRetryAfterReconnect) {
        void this.runSync(range);
      } else if (this.hasPendingSync) {
        const pendingRange = this.pendingSyncRange;
        const pendingResolvers = this.pendingSyncResolvers.splice(0);

        this.hasPendingSync = false;
        this.pendingSyncRange = null;
        this.clearPollTimer();

        void this.runSync(pendingRange).finally(() => {
          for (const resolve of pendingResolvers) {
            resolve();
          }
        });
      }
    }
  }

  private schedulePoll(delayMs: number): void {
    if (!this.isRunning) return;
    if (document.visibilityState !== "visible") return;

    this.clearPollTimer();

    this.pollTimerId = setTimeout(() => {
      this.pollTimerId = null;
      void this.runSync();
    }, delayMs);
  }

  // ─────────────────────────────────────────────
  // full sync
  // ─────────────────────────────────────────────

  private async doFullSync(
    calendarId: string,
    accentColor: string,
    accessToken: string,
    range: GCalSyncRange,
    shouldStoreSyncToken: boolean,
  ): Promise<void> {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: range.rangeStart.toISOString(),
      timeMax: range.rangeEnd.toISOString(),
    });

    const encodedId = encodeURIComponent(calendarId);

    let pageToken: string | undefined;
    const allEvents: GCalRawIncrementalEvent[] = [];
    let syncToken: string | undefined;

    do {
      if (pageToken) params.set("pageToken", pageToken);

      const url = `${GCAL_API_BASE}/calendars/${encodedId}/events?${params.toString()}`;

      const response = await gcalGet<GCalEventsListResponse>(accessToken, url);

      allEvents.push(...(response.items ?? []));
      pageToken = response.nextPageToken;
      syncToken = response.nextSyncToken ?? syncToken;
    } while (pageToken);

    if (syncToken && shouldStoreSyncToken) {
      this.syncTokenMap[
        buildSyncTokenKey(this.options.accountId, calendarId)
      ] = syncToken;
      this.syncTokenMap = mergeWriteSyncTokens(this.syncTokenMap);
    }

    const events = allEvents
      .map((raw) =>
        toCalendarEvent(raw, calendarId, accentColor, this.options.accountId),
      )
      .filter((event): event is GoogleCalendarEvent => Boolean(event));

    if (this.options.onEventsRangeReplaced) {
      this.options.onEventsRangeReplaced({
        calendarId,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        events,
      });
      return;
    }

    for (const event of events) {
      this.options.onEventAdded(event);
    }
  }

  // ─────────────────────────────────────────────
  // incremental sync
  // ─────────────────────────────────────────────

  private async doIncrementalSync(
    calendarId: string,
    syncToken: string,
    accentColor: string,
    accessToken: string,
  ): Promise<void> {
    const encodedId = encodeURIComponent(calendarId);

    const params = new URLSearchParams({ syncToken });

    let pageToken: string | undefined;
    const diffEvents: GCalRawIncrementalEvent[] = [];
    let nextSyncToken: string | undefined;

    try {
      do {
        if (pageToken) params.set("pageToken", pageToken);

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
        const latestSyncTokenMap = readSyncTokens();
        const syncTokenKey = buildSyncTokenKey(
          this.options.accountId,
          calendarId,
        );

        delete latestSyncTokenMap[syncTokenKey];
        delete this.syncTokenMap[syncTokenKey];
        writeSyncTokens(latestSyncTokenMap);
        this.syncTokenMap = latestSyncTokenMap;

        await this.doFullSync(
          calendarId,
          accentColor,
          accessToken,
          this.getDefaultFullSyncRange(),
          true,
        );
        return;
      }

      throw error;
    }

    if (nextSyncToken) {
      this.syncTokenMap[
        buildSyncTokenKey(this.options.accountId, calendarId)
      ] = nextSyncToken;
      this.syncTokenMap = mergeWriteSyncTokens(this.syncTokenMap);
    }

    this.applyDiff(calendarId, accentColor, diffEvents);
  }

  private applyDiff(
    calendarId: string,
    accentColor: string,
    rawEvents: GCalRawIncrementalEvent[],
  ): void {
    for (const raw of rawEvents) {
      if (!raw.id) continue;

      const compositeId = buildCompositeEventId(
        this.options.accountId,
        calendarId,
        raw.id,
      );

      if (raw.status === "cancelled") {
        this.options.onEventDeleted(compositeId);
        continue;
      }

      const event = toCalendarEvent(
        raw,
        calendarId,
        accentColor,
        this.options.accountId,
      );
      if (!event) continue;

      this.options.onEventUpdated(event);
    }
  }
}
