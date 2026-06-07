import { GoogleCalendarSyncEngine } from "@/sync/googlecalendar-sync/GoogleCalendarSyncEngine";
import type { GCalForceSyncOptions, GoogleCalendarListItem } from "./gcalSync.types";

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

type GoogleCalendarEngineManagerOptions = {
  createEngine: (accountId: string) => GoogleCalendarSyncEngine;
};

const serializeSelectedCalendarIds = (selectedCalendarIds: Set<string>): string => Array.from(selectedCalendarIds).slice().sort().join("|");

const serializeCalendars = (calendars: GoogleCalendarListItem[]): string => calendars.map((calendar) => [calendar.id, calendar.summary ?? "", calendar.backgroundColor ?? "", calendar.foregroundColor ?? ""].join(":")).sort().join("|");

const createEngineState = (context: EngineContext): EngineState => ({
  token: context.accessToken,
  calIds: serializeSelectedCalendarIds(context.selectedCalendarIds),
  calendars: serializeCalendars(context.calendars),
});

const isSameEngineState = (left: EngineState | undefined, right: EngineState): boolean => left?.token === right.token && left.calIds === right.calIds && left.calendars === right.calendars;

class GoogleCalendarEngineManager {
  private readonly createEngine: GoogleCalendarEngineManagerOptions["createEngine"];

  private readonly engines = new Map<string, GoogleCalendarSyncEngine>();

  private readonly state = new Map<string, EngineState>();

  constructor({ createEngine }: GoogleCalendarEngineManagerOptions) {
    this.createEngine = createEngine;
  }

  upsert(accountId: string, context: EngineContext): void {
    const nextState = createEngineState(context);
    const currentState = this.state.get(accountId);
    const currentEngine = this.engines.get(accountId);

    if (!currentEngine) {
      const engine = this.createEngine(accountId);
      this.engines.set(accountId, engine);
      this.state.set(accountId, nextState);
      engine.start(context);
      return;
    }

    if (isSameEngineState(currentState, nextState)) {
      currentEngine.updateContext(context);
      return;
    }

    this.state.set(accountId, nextState);

    if (currentState?.token === nextState.token && currentState.calIds === nextState.calIds) {
      currentEngine.updateContext(context);
      return;
    }

    currentEngine.start(context);
  }

  stop(accountId: string): void {
    this.engines.get(accountId)?.stop();
    this.engines.delete(accountId);
    this.state.delete(accountId);
  }

  stopAll(): void {
    this.engines.forEach((engine) => {
      engine.stop();
    });
    this.engines.clear();
    this.state.clear();
  }

  async forceSync(accountId: string): Promise<void> {
    const engine = this.engines.get(accountId);
    if (!engine) return;

    await engine.forceSync();
  }

  async forceSyncAll(options: GCalForceSyncOptions = {}): Promise<void> {
    const engines = Array.from(this.engines.values());
    await Promise.all(engines.map((engine) => {
      if (options.rangeStart && options.rangeEnd) {
        return engine.forceSyncRange(options);
      }

      return engine.forceSync();
    }));
  }
}

export { GoogleCalendarEngineManager };
export type { EngineContext, EngineState, GoogleCalendarEngineManagerOptions };
