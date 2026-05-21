import { GoogleCalendarSyncEngine } from "../googlecalendar-sync/GoogleCalendarSyncEngine";

import type {
  GCalForceSyncOptions,
  GoogleCalendarListItem,
} from "./gcalSync.types";

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

export class GoogleCalendarEngineManager {
  private engines = new Map<string, GoogleCalendarSyncEngine>();

  private state = new Map<string, EngineState>();

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
  }

  stop(accountId: string): void {
    const engine = this.engines.get(accountId);

    if (engine) {
      engine.stop();
      this.engines.delete(accountId);
    }

    this.state.delete(accountId);
  }

  stopAll(): void {
    for (const engine of this.engines.values()) {
      engine.stop();
    }

    this.engines.clear();
    this.state.clear();
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
    await Promise.all(
      Array.from(this.engines.values()).map((engine) => {
        if (options.rangeStart && options.rangeEnd) {
          return engine.forceSyncRange(options);
        }

        return engine.forceSync();
      }),
    );
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
