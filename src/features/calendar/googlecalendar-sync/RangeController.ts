import type { GoogleCalendarSyncEngine } from "./GoogleCalendarSyncEngine";

type Range = {
  start: Date;
  end: Date;
};

type RangeState = {
  start: Date | null;
  end: Date | null;
};

export class RangeController {
  private engineMap = new Map<string, GoogleCalendarSyncEngine>();

  private state: RangeState = {
    start: null,
    end: null,
  };

  private inflight = false;

  register(calendarId: string, engine: GoogleCalendarSyncEngine): void {
    this.engineMap.set(calendarId, engine);
  }

  unregister(calendarId: string): void {
    this.engineMap.delete(calendarId);
  }

  async ensureRangeLoaded(start: Date, end: Date): Promise<void> {
    if (!this.needsExpansion(start, end)) return;
    if (this.inflight) return;

    this.inflight = true;

    try {
      this.state = this.mergeRange(start, end);
      await this.loadRange(this.state);
    } finally {
      this.inflight = false;
    }
  }

  private needsExpansion(start: Date, end: Date): boolean {
    if (!this.state.start || !this.state.end) return true;

    return start < this.state.start || end > this.state.end;
  }

  private mergeRange(start: Date, end: Date): Range {
    return {
      start:
        !this.state.start || start < this.state.start
          ? start
          : this.state.start,
      end: !this.state.end || end > this.state.end ? end : this.state.end,
    };
  }

  private async loadRange(range: Range): Promise<void> {
    const engines = Array.from(this.engineMap.values());

    await Promise.allSettled(
      engines.map((engine) => this.loadForEngine(engine, range)),
    );
  }

  private async loadForEngine(
    engine: GoogleCalendarSyncEngine,
    range: Range,
  ): Promise<void> {
    // ここを「存在するAPI」に合わせる必要あり
    await engine.ensureRange(range.start, range.end);
  }
}