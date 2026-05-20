import { GoogleCalendarSyncEngine } from "../googlecalendar-sync/GoogleCalendarSyncEngine";
import type { GoogleCalendarListItem } from "./gcalSync.types";

type EngineContext = {
  accessToken: string;
  selectedCalendarIds: Set<string>;
  calendars: GoogleCalendarListItem[];
};

type EngineState = {
  token: string;
  calIds: string;
};

export class GoogleCalendarEngineManager {
  private engines = new Map<string, GoogleCalendarSyncEngine>();
  private state = new Map<string, EngineState>();

  constructor(
    private deps: {
      createEngine: (accountId: string) => GoogleCalendarSyncEngine;
    },
  ) {}

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────

  upsert(accountId: string, ctx: EngineContext) {
    if (!ctx.accessToken || ctx.selectedCalendarIds.size === 0) {
      this.stop(accountId);
      return;
    }

    const calIdsKey = this.buildCalKey(ctx.selectedCalendarIds);
    const prev = this.state.get(accountId);

    // idempotent check（超重要）
    if (prev?.token === ctx.accessToken && prev?.calIds === calIdsKey) {
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
    });
  }

  stop(accountId: string) {
    const engine = this.engines.get(accountId);
    if (engine) {
      engine.stop();
      this.engines.delete(accountId);
    }
    this.state.delete(accountId);
  }

  stopAll() {
    for (const engine of this.engines.values()) {
      engine.stop();
    }
    this.engines.clear();
    this.state.clear();
  }

  removeAccount(accountId: string) {
    this.stop(accountId);
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

  // ─────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────

  private buildCalKey(set: Set<string>): string {
    return [...set].sort().join(",");
  }
}
