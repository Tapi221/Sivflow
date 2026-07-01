import { addDays, subDays } from "date-fns";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcal.api";
import type { GCalEventsListResponse, GCalForceSyncOptions, GCalRawIncrementalEvent, GCalSyncEngineOptions, GCalSyncRange, GCalSyncStartContext, GCalSyncState, GCalSyncTokenMap, GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { deleteCachedGoogleCalendarEvent, readCachedGoogleCalendarEvents, replaceCachedGoogleCalendarRange, upsertCachedGoogleCalendarEvent } from "@/integration/googlecalendar-integration/googleCalendarEventCache";



const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";
const SYNC_TOKENS_STORAGE_KEY = "flashcard-master.gcal.sync_tokens";
const DEFAULT_POLL_INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 10 * 60 * 1000;
const INITIAL_BACKOFF_MS = 60_000;
const DEFAULT_FULL_SYNC_PAST_DAYS = 365;
const DEFAULT_FULL_SYNC_FUTURE_DAYS = 3650;



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
const buildSyncTokenKey = (accountId: string | undefined, calendarId: string) => accountId ? `${accountId}:${calendarId}` : calendarId;
const buildCompositeEventId = (accountId: string | undefined, calendarId: string, eventId: string) => accountId ? `${accountId}:${calendarId}:${eventId}` : `${calendarId}:${eventId}`;
const mergeWriteSyncTokens = (map: GCalSyncTokenMap): GCalSyncTokenMap => {
  const next = {
    ...readSyncTokens(),
    ...map,
  };

  writeSyncTokens(next);

  return next;
};
const gcalGet = async <T>(accessToken: string, url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as
      | {
        error?: {
          message?: string;
          errors?: Array<{ reason?: string; }>;
        };
      }
      | null;
    const reason = payload?.error?.errors?.[0]?.reason;
    const message = payload?.error?.message;
    const error = new Error(
      message
        ? `Google Calendar API エラー (${response.status}): ${message}`
        : `Google Calendar API エラー (${response.status}): ${url}`,
    );

    (
      error as Error & {
        googleReason?: string;
        status: number;
      }
    ).status = response.status;
    (error as Error & { googleReason?: string; }).googleReason = reason;

    throw error;
  }

  return (await response.json()) as T;
};
const isRecoverableAuthError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const { googleReason, status } = error as Error & {
    googleReason?: string;
    status?: number;
  };

  return (
    status === 401 ||
    (status === 403 &&
      (googleReason === "authError" ||
        googleReason === "insufficientPermissions"))
  );
};
const parseGoogleDate = (rawValue: string): Date => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(rawValue);
};
const parseEventStart = (start: GCalRawIncrementalEvent["start"]): Date | null => {
  const rawValue = start?.dateTime ?? start?.date;
  if (!rawValue) return null;

  const date = parseGoogleDate(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};
const parseEventEnd = (end: GCalRawIncrementalEvent["end"]): Date | null => {
  const rawValue = end?.dateTime ?? end?.date;
  if (!rawValue) return null;

  const date = parseGoogleDate(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};
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
    externalId: raw.id,
    accountId,
    calendarId,
    accentColor,
    title: raw.summary ?? "(No title)",
    description: raw.description,
    location: raw.location,
    startsAt,
    endsAt,
    isAllDay: Boolean(raw.start?.date && !raw.start?.dateTime),
  };
};
const resolveExternalEventId = (accountId: string | undefined, calendarId: string, eventId: string): string => {
  const accountPrefix = accountId ? `${accountId}:${calendarId}:` : null;
  const calendarPrefix = `${calendarId}:`;

  if (accountPrefix && eventId.startsWith(accountPrefix)) return eventId.slice(accountPrefix.length);
  if (eventId.startsWith(calendarPrefix)) return eventId.slice(calendarPrefix.length);

  return eventId;
};
class GoogleCalendarSyncEngine {
  private readonly options: Required<Pick<GCalSyncEngineOptions, "pollIntervalMs" | "fullSyncPastDays" | "fullSyncFutureDays">> & GCalSyncEngineOptions;

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

  start(context: GCalSyncStartContext): void {
    this.stop();

    this.context = context;
    this.isRunning = true;
    this.isFullSyncAllowed = true;

    this.currentBackoffMs = INITIAL_BACKOFF_MS;

    this.visibilityChangeListener = this.handleVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.visibilityChangeListener);

    void this.restoreCachedEvents();
    void this.runSync();
  }

  stop(): void {
    this.isRunning = false;
    this.clearPollTimer();
    this.resolvePendingSync();
    this.context = null;

    if (this.visibilityChangeListener) {
      document.removeEventListener("visibilitychange", this.visibilityChangeListener);
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

  async createEvent(event: GCalWritableEventInput): Promise<GoogleCalendarEvent | null> {
    const context = this.context;
    if (!context) return null;

    const accentColor = this.getCalendarAccentColor(event.calendarId);
    const token = await this.getWritableAccessToken();
    if (!token) return null;

    const created = await this.runWritableOperation(() => createGoogleCalendarEvent({ accessToken: token, accountId: this.options.accountId, accentColor, event }));
    if (!created) return null;

    this.options.onEventAdded(created);
    void upsertCachedGoogleCalendarEvent(this.options.accountId, created).catch((error) => {
      console.warn("[GCalSyncEngine] cache event create failed", error);
    });

    return created;
  }

  async updateEvent(event: GCalWritableEventUpdateInput): Promise<GoogleCalendarEvent | null> {
    const context = this.context;
    if (!context) return null;

    const accentColor = this.getCalendarAccentColor(event.calendarId);
    const token = await this.getWritableAccessToken();
    if (!token) return null;

    const externalEventId = resolveExternalEventId(this.options.accountId, event.calendarId, event.eventId);
    const updated = await this.runWritableOperation(() => updateGoogleCalendarEvent({ accessToken: token, accountId: this.options.accountId, accentColor, event: { ...event, eventId: externalEventId } }));
    if (!updated) return null;

    this.options.onEventUpdated(updated);
    void upsertCachedGoogleCalendarEvent(this.options.accountId, updated).catch((error) => {
      console.warn("[GCalSyncEngine] cache event update failed", error);
    });

    return updated;
  }

  async deleteEvent(event: GCalWritableEventDeleteInput): Promise<void> {
    const context = this.context;
    if (!context) return;

    const token = await this.getWritableAccessToken();
    if (!token) return;

    const externalEventId = resolveExternalEventId(this.options.accountId, event.calendarId, event.eventId);
    await this.runWritableOperation(async () => {
      await deleteGoogleCalendarEvent({ accessToken: token, event: { ...event, eventId: externalEventId } });
      return null;
    });

    const compositeId = buildCompositeEventId(this.options.accountId, event.calendarId, externalEventId);
    this.options.onEventDeleted(compositeId);
    void deleteCachedGoogleCalendarEvent(this.options.accountId, event.calendarId, compositeId).catch((error) => {
      console.warn("[GCalSyncEngine] cache event delete failed", error);
    });
  }

  private async runWritableOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (!isRecoverableAuthError(error)) {
        this.options.onError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }

      const reconnectResult = await this.options.silentReconnect();
      const reconnected = reconnectResult === true || reconnectResult === "reconnected";

      if (!reconnected) {
        this.setSyncState(reconnectResult === "needsReconnect" ? "needsReconnect" : "error");
        return null;
      }

      return operation();
    }
  }

  private async getWritableAccessToken(): Promise<string | null> {
    const token = this.options.getAccessToken?.() ?? this.context?.accessToken ?? null;
    if (token) return token;

    const reconnectResult = await this.options.silentReconnect();
    const reconnected = reconnectResult === true || reconnectResult === "reconnected";
    if (!reconnected) return null;

    return this.options.getAccessToken?.() ?? this.context?.accessToken ?? null;
  }

  private getCalendarAccentColor(calendarId: string): string {
    return this.context?.calendars.find((calendar) => calendar.id === calendarId)?.backgroundColor ?? "#185FA5";
  }

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

  private handleVisibilityChange(): void {
    if (!this.isRunning) return;

    if (document.visibilityState === "visible") {
      this.clearPollTimer();

      this.isFullSyncAllowed = false;

      void this.runSync();
    } else {
      this.clearPollTimer();
    }
  }

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

  private async restoreCachedEvents(): Promise<void> {
    const context = this.context;
    const onEventsRangeReplaced = this.options.onEventsRangeReplaced;

    if (!context || !onEventsRangeReplaced) return;

    const range = this.getDefaultFullSyncRange();

    await Promise.all(
      Array.from(context.selectedCalendarIds).map(async (calendarId) => {
        const events = await readCachedGoogleCalendarEvents({
          accountIds: this.options.accountId ? [this.options.accountId] : undefined,
          calendarIds: [calendarId],
          rangeStart: range.rangeStart,
          rangeEnd: range.rangeEnd,
        });

        if (!this.isRunning || events.length === 0) return;

        onEventsRangeReplaced({
          calendarId,
          rangeStart: range.rangeStart,
          rangeEnd: range.rangeEnd,
          events,
        });
      }),
    ).catch((error) => {
      console.warn("[GCalSyncEngine] restore cached events failed", error);
    });
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
    const shouldFullSyncAllCalendars = !range && this.isFullSyncAllowed;

    let shouldRetryAfterReconnect = false;

    try {
      for (const calendarId of selectedCalendarIds) {
        if (!this.isRunning) break;

        const token = this.options.getAccessToken?.() ?? this.context?.accessToken ?? accessToken;

        if (!token) {
          throw new Error("Google Calendar access token is missing");
        }

        const accentColor = calendarMap.get(calendarId)?.backgroundColor ?? "#185FA5";

        const syncTokenKey = buildSyncTokenKey(this.options.accountId, calendarId);
        const existingSyncToken = this.syncTokenMap[syncTokenKey];

        if (range) {
          await this.doFullSync(calendarId, accentColor, token, range, false);
        } else if (existingSyncToken && !shouldFullSyncAllCalendars) {
          await this.doIncrementalSync(calendarId, existingSyncToken, accentColor, token);
        } else {
          await this.doFullSync(calendarId, accentColor, token, this.getDefaultFullSyncRange(), true);
        }
      }

      if (shouldFullSyncAllCalendars) {
        this.isFullSyncAllowed = false;
      }

      if (!this.isRunning) return;

      this.currentBackoffMs = INITIAL_BACKOFF_MS;

      this.lastSyncedAt = new Date();
      this.options.onLastSyncedAtChange(this.lastSyncedAt);

      this.setSyncState("idle");
      this.schedulePoll(this.options.pollIntervalMs);
    } catch (error) {
      if (!this.isRunning) return;

      console.error("[GCalSyncEngine] sync error:", error);

      if (isRecoverableAuthError(error)) {
        const reconnectResult = await this.options.silentReconnect();
        const reconnected = reconnectResult === true || reconnectResult === "reconnected";

        if (reconnected && this.isRunning) {
          shouldRetryAfterReconnect = true;
          return;
        }

        if (reconnectResult === "retryLater") {
          this.setSyncState("error");

          const backoffMs = this.currentBackoffMs;
          this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, MAX_BACKOFF_MS);

          this.schedulePoll(backoffMs);
          return;
        }

        if (!this.isRunning) return;

        this.setSyncState("needsReconnect");
        this.options.onError(new Error("Google Calendar の再連携が必要です"));
        return;
      }

      this.setSyncState("error");

      this.options.onError(error instanceof Error ? error : new Error(String(error)));

      const backoffMs = this.currentBackoffMs;
      this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, MAX_BACKOFF_MS);

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

      if (!this.isRunning) return;

      allEvents.push(...(response.items ?? []));
      pageToken = response.nextPageToken;
      syncToken = response.nextSyncToken ?? syncToken;
    } while (pageToken);

    if (!this.isRunning) return;

    if (syncToken && shouldStoreSyncToken) {
      this.syncTokenMap[buildSyncTokenKey(this.options.accountId, calendarId)] = syncToken;
      this.syncTokenMap = mergeWriteSyncTokens(this.syncTokenMap);
    }

    const events = allEvents
      .map((raw) => toCalendarEvent(raw, calendarId, accentColor, this.options.accountId))
      .filter((event): event is GoogleCalendarEvent => Boolean(event));

    if (!this.isRunning) return;

    if (this.options.onEventsRangeReplaced) {
      this.options.onEventsRangeReplaced({
        calendarId,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        events,
      });
    } else {
      for (const event of events) {
        if (!this.isRunning) return;
        this.options.onEventAdded(event);
      }
    }

    void replaceCachedGoogleCalendarRange({
      accountId: this.options.accountId,
      calendarId,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      events,
    }).catch((error) => {
      console.warn("[GCalSyncEngine] cache range replace failed", error);
    });
  }

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

        const response = await gcalGet<GCalEventsListResponse>(accessToken, url);

        if (!this.isRunning) return;

        diffEvents.push(...(response.items ?? []));
        pageToken = response.nextPageToken;
        nextSyncToken = response.nextSyncToken ?? nextSyncToken;
      } while (pageToken);
    } catch (error) {
      if (!this.isRunning) return;

      const is410 = error instanceof Error && (error as Error & { status?: number; }).status === 410;

      if (is410) {
        const latestSyncTokenMap = readSyncTokens();
        const syncTokenKey = buildSyncTokenKey(this.options.accountId, calendarId);

        delete latestSyncTokenMap[syncTokenKey];
        delete this.syncTokenMap[syncTokenKey];
        writeSyncTokens(latestSyncTokenMap);
        this.syncTokenMap = latestSyncTokenMap;

        await this.doFullSync(calendarId, accentColor, accessToken, this.getDefaultFullSyncRange(), true);
        return;
      }

      throw error;
    }

    if (!this.isRunning) return;

    if (nextSyncToken) {
      this.syncTokenMap[buildSyncTokenKey(this.options.accountId, calendarId)] = nextSyncToken;
      this.syncTokenMap = mergeWriteSyncTokens(this.syncTokenMap);
    }

    if (!this.isRunning) return;

    this.applyDiff(calendarId, accentColor, diffEvents);
  }

  private applyDiff(calendarId: string, accentColor: string, rawEvents: GCalRawIncrementalEvent[]): void {
    if (!this.isRunning) return;

    for (const raw of rawEvents) {
      if (!this.isRunning) return;
      if (!raw.id) continue;

      const compositeId = buildCompositeEventId(this.options.accountId, calendarId, raw.id);

      if (raw.status === "cancelled") {
        this.options.onEventDeleted(compositeId);
        void deleteCachedGoogleCalendarEvent(this.options.accountId, calendarId, compositeId).catch((error) => {
          console.warn("[GCalSyncEngine] cache event delete failed", error);
        });
        continue;
      }

      const event = toCalendarEvent(raw, calendarId, accentColor, this.options.accountId);
      if (!event) continue;

      this.options.onEventUpdated(event);
      void upsertCachedGoogleCalendarEvent(this.options.accountId, event).catch((error) => {
        console.warn("[GCalSyncEngine] cache event upsert failed", error);
      });
    }
  }
}



export { GoogleCalendarSyncEngine };
