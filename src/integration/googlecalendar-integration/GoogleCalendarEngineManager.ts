import { auth } from "@platform/firebase/client";
import type { GCalForceSyncOptions, GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarEvent, GoogleCalendarListItem } from "./gcalSync.types";
import { GoogleCalendarSyncEngine } from "@/sync/googlecalendar-sync/GoogleCalendarSyncEngine";
import { GoogleCalendarWatchManager } from "@/sync/googlecalendar-sync/GoogleCalendarWatchManager";



type EngineContext = {
  accessToken: string;
  selectedCalendarIds: Set<string>;
  calendars: GoogleCalendarListItem[];
};
type EngineState = {
  token: string;
  calIds: string;
  calendars: string;
};
type WatchRegistrationResult = {
  action: "add" | "remove";
  calendarId: string;
};



class GoogleCalendarEngineManager {
  private engines = new Map<string, GoogleCalendarSyncEngine>();

  private state = new Map<string, EngineState>();

  private pendingForceSyncOptions: GCalForceSyncOptions | null = null;

  private appliedPendingForceSyncKeys = new Map<string, string>();

  private watchManagers = new Map<string, GoogleCalendarWatchManager>();

  private watchUserIds = new Map<string, string>();

  private watchAccessTokens = new Map<string, string>();

  private watchedCalendarIds = new Map<string, Set<string>>();

  private watchSyncVersions = new Map<string, number>();

  private watchRefreshFailedAccountIds = new Set<string>();

  constructor(
    private deps: {
      createEngine: (accountId: string) => GoogleCalendarSyncEngine;
    },
  ) {}

  upsert(accountId: string, ctx: EngineContext): void {
    if (!ctx.accessToken || ctx.selectedCalendarIds.size === 0) {
      this.stop(accountId);
      return;
    }

    const calIdsKey = this.buildCalKey(ctx.selectedCalendarIds);
    const calendarsKey = this.buildCalendarsKey(ctx.calendars);
    const prev = this.state.get(accountId);

    if (
      prev?.token === ctx.accessToken &&
      prev.calIds === calIdsKey &&
      prev.calendars === calendarsKey
    ) {
      this.applyPendingForceSync(accountId);
      this.syncWatchRegistrations(accountId, ctx.accessToken, ctx.selectedCalendarIds);
      return;
    }

    let engine = this.engines.get(accountId);

    if (!engine) {
      engine = this.deps.createEngine(accountId);
      this.engines.set(accountId, engine);
    }

    engine.start({
      accessToken: ctx.accessToken,
      selectedCalendarIds: ctx.selectedCalendarIds,
      calendars: ctx.calendars,
    });

    this.state.set(accountId, {
      token: ctx.accessToken,
      calIds: calIdsKey,
      calendars: calendarsKey,
    });

    this.applyPendingForceSync(accountId);
    this.syncWatchRegistrations(accountId, ctx.accessToken, ctx.selectedCalendarIds);
  }

  stop(accountId: string): void {
    const engine = this.engines.get(accountId);

    if (engine) {
      engine.stop();
      this.engines.delete(accountId);
    }

    this.state.delete(accountId);
    this.appliedPendingForceSyncKeys.delete(accountId);
    this.cleanupWatchManager(accountId);
  }

  stopAll(): void {
    for (const engine of this.engines.values()) {
      engine.stop();
    }

    for (const accountId of Array.from(this.watchManagers.keys())) {
      this.cleanupWatchManager(accountId);
    }

    this.engines.clear();
    this.state.clear();
    this.appliedPendingForceSyncKeys.clear();
  }

  removeAccount(accountId: string): void {
    this.stop(accountId);
  }

  async forceSync(
    accountId: string,
    options: GCalForceSyncOptions = {},
  ): Promise<void> {
    const engine = this.engines.get(accountId);

    if (!engine) return;

    if (options.rangeStart && options.rangeEnd) {
      await engine.forceSyncRange(options);
      return;
    }

    await engine.forceSync();
  }

  async forceSyncAll(options: GCalForceSyncOptions = {}): Promise<void> {
    this.pendingForceSyncOptions = options;

    if (this.engines.size === 0) return;

    const pendingKey = this.buildForceSyncKey(options);

    await Promise.all(
      Array.from(this.engines.entries()).map(async ([accountId, engine]) => {
        if (options.rangeStart && options.rangeEnd) {
          await engine.forceSyncRange(options);
        } else {
          await engine.forceSync();
        }

        this.appliedPendingForceSyncKeys.set(accountId, pendingKey);
      }),
    );
  }

  async createEvent(accountId: string, event: GCalWritableEventInput): Promise<GoogleCalendarEvent | null> {
    return this.engines.get(accountId)?.createEvent(event) ?? null;
  }

  async updateEvent(accountId: string, event: GCalWritableEventUpdateInput): Promise<GoogleCalendarEvent | null> {
    return this.engines.get(accountId)?.updateEvent(event) ?? null;
  }

  async deleteEvent(accountId: string, event: GCalWritableEventDeleteInput): Promise<void> {
    await this.engines.get(accountId)?.deleteEvent(event);
  }

  getActiveIds(): string[] {
    return [...this.engines.keys()];
  }

  has(accountId: string): boolean {
    return this.engines.has(accountId);
  }

  getEngine(accountId: string): GoogleCalendarSyncEngine | undefined {
    return this.engines.get(accountId);
  }

  private applyPendingForceSync(accountId: string): void {
    const options = this.pendingForceSyncOptions;
    const engine = this.engines.get(accountId);

    if (!options || !engine) return;

    const pendingKey = this.buildForceSyncKey(options);
    if (this.appliedPendingForceSyncKeys.get(accountId) === pendingKey) return;

    this.appliedPendingForceSyncKeys.set(accountId, pendingKey);

    if (options.rangeStart && options.rangeEnd) {
      void engine.forceSyncRange(options);
      return;
    }

    void engine.forceSync();
  }

  private syncWatchRegistrations(
    accountId: string,
    accessToken: string,
    selectedCalendarIds: Set<string>,
  ): void {
    const userId = auth.currentUser?.uid ?? null;

    if (!userId) {
      this.cleanupWatchManager(accountId);
      return;
    }

    const previousUserId = this.watchUserIds.get(accountId);

    if (previousUserId && previousUserId !== userId) {
      this.cleanupWatchManager(accountId);
    }

    const manager = this.ensureWatchManager(accountId, userId);
    const previousIds = this.watchedCalendarIds.get(accountId) ?? new Set<string>();
    const nextIds = new Set(selectedCalendarIds);
    const previousAccessToken = this.watchAccessTokens.get(accountId);
    const shouldRefreshSelected =
      previousAccessToken !== accessToken ||
      this.watchRefreshFailedAccountIds.has(accountId);
    const idsToRemove = [...previousIds].filter((calendarId) => !nextIds.has(calendarId));
    const idsToRegister = shouldRefreshSelected
      ? [...nextIds]
      : [...nextIds].filter((calendarId) => !previousIds.has(calendarId));

    this.watchAccessTokens.set(accountId, accessToken);

    if (idsToRemove.length === 0 && idsToRegister.length === 0) {
      this.watchedCalendarIds.set(accountId, nextIds);
      return;
    }

    const version = this.nextWatchSyncVersion(accountId);
    const tasks: Promise<WatchRegistrationResult>[] = [
      ...idsToRemove.map(async (calendarId): Promise<WatchRegistrationResult> => {
        await manager.stopWatch(calendarId, accessToken);
        return { action: "remove", calendarId };
      }),
      ...idsToRegister.map(async (calendarId): Promise<WatchRegistrationResult> => {
        await manager.registerWatch(calendarId, accessToken);
        return { action: "add", calendarId };
      }),
    ];

    void (async () => {
      const results = await Promise.allSettled(tasks);

      if (this.watchSyncVersions.get(accountId) !== version) {
        return;
      }

      const nextWatchedIds = new Set(previousIds);
      let hasRegisterFailure = false;

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.action === "add") {
            nextWatchedIds.add(result.value.calendarId);
          } else {
            nextWatchedIds.delete(result.value.calendarId);
          }
          return;
        }

        hasRegisterFailure = true;
        console.warn("[GoogleCalendar] watch registration update failed", result.reason);
      });

      if (hasRegisterFailure) {
        this.watchRefreshFailedAccountIds.add(accountId);
      } else {
        this.watchRefreshFailedAccountIds.delete(accountId);
      }

      this.watchedCalendarIds.set(accountId, nextWatchedIds);
    })();
  }

  private ensureWatchManager(
    accountId: string,
    userId: string,
  ): GoogleCalendarWatchManager {
    let manager = this.watchManagers.get(accountId);

    if (!manager) {
      manager = new GoogleCalendarWatchManager(userId);
      this.watchManagers.set(accountId, manager);
    }

    this.watchUserIds.set(accountId, userId);
    return manager;
  }

  private cleanupWatchManager(accountId: string): void {
    this.nextWatchSyncVersion(accountId);

    const manager = this.watchManagers.get(accountId);
    const accessToken = this.watchAccessTokens.get(accountId);

    this.watchManagers.delete(accountId);
    this.watchUserIds.delete(accountId);
    this.watchAccessTokens.delete(accountId);
    this.watchedCalendarIds.delete(accountId);
    this.watchRefreshFailedAccountIds.delete(accountId);

    if (!manager || !accessToken) {
      return;
    }

    void manager.stopAll(accessToken).catch((error) => {
      console.warn("[GoogleCalendar] watch cleanup failed", error);
    });
  }

  private nextWatchSyncVersion(accountId: string): number {
    const version = (this.watchSyncVersions.get(accountId) ?? 0) + 1;

    this.watchSyncVersions.set(accountId, version);
    return version;
  }

  private buildForceSyncKey(options: GCalForceSyncOptions): string {
    return [
      options.rangeStart?.toISOString() ?? "full",
      options.rangeEnd?.toISOString() ?? "full",
    ].join("|");
  }

  private buildCalKey(set: Set<string>): string {
    return [...set].sort().join(",");
  }

  private buildCalendarsKey(calendars: GoogleCalendarListItem[]): string {
    return calendars
      .map((calendar) => `${calendar.id}:${calendar.backgroundColor ?? ""}`)
      .sort()
      .join(",");
  }
}



export { GoogleCalendarEngineManager };
