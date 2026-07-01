import { getLocalDb } from "@/services/localdb";
import { StorageStateManager } from "./StorageStateManager";



interface CompressedHistory {
  id: string;
  userId: string;
  cardId: string;
  date: Date;
  reviewCount: number;
  correctCount: number;
  avgInterval: number;
}
type HistoryEvent = {
  cardId: string;
  changedAt: Date;
  correct?: boolean;
  newLevel?: number;
  oldLevel?: number;
  interval?: number;
};



const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};
const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};
const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};
const toHistoryEvent = (value: unknown): HistoryEvent | null => {
  if (!isRecord(value)) return null;
  const cardId = typeof value.cardId === "string" ? value.cardId : null;
  const changedAt = toDate(value.changedAt);

  if (!cardId || !changedAt) return null;

  const correct =
    typeof value.correct === "boolean" ? value.correct : undefined;

  return {
    cardId,
    changedAt,
    correct,
    newLevel: toFiniteNumber(value.newLevel),
    oldLevel: toFiniteNumber(value.oldLevel),
    interval: toFiniteNumber(value.interval),
  };
};
class HistoryCompressionService {
  public readonly compress = async (userId: string): Promise<void> => {
    if (StorageStateManager.isReadOnly(userId)) {
      console.log(`[Compression:${userId}] スキップしました（READ_ONLY モード）`);
      return;
    }

    const db = await getLocalDb(userId);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldEvents = await db.levelHistories
        .where("changedAt")
        .below(thirtyDaysAgo)
        .toArray();

      if (oldEvents.length === 0) {
        console.log(`[Compression:${userId}] 圧縮対象の古いイベントはありません`);
        return;
      }

      const compressed = this.compressByDay(oldEvents, userId);

      console.log(
        `[Compression:${userId}] ${oldEvents.length} 件のイベントを ${compressed.length} 件の日次サマリーに圧縮しました`,
      );
    } catch (error) {
      console.error(`[Compression:${userId}] Failed:`, error);
    }
  };

  private readonly compressByDay = (
    events: unknown[],
    userId: string,
  ): CompressedHistory[] => {
    const byDay = new Map<string, HistoryEvent[]>();

    for (const rawEvent of events) {
      const event = toHistoryEvent(rawEvent);
      if (!event) continue;

      const day = event.changedAt.toISOString().split("T")[0];
      const key = `${event.cardId}_${day}`;

      const existing = byDay.get(key);
      if (existing) {
        existing.push(event);
      } else {
        byDay.set(key, [event]);
      }
    }

    const compressed: CompressedHistory[] = [];

    for (const [key, dayEvents] of byDay.entries()) {
      const separatorIndex = key.lastIndexOf("_");
      const cardId = key.slice(0, separatorIndex);
      const day = key.slice(separatorIndex + 1);

      const correctCount = dayEvents.filter((event) => {
        if (typeof event.correct === "boolean") return event.correct;
        if (
          typeof event.newLevel === "number" &&
          typeof event.oldLevel === "number"
        ) {
          return event.newLevel > event.oldLevel;
        }
        return false;
      }).length;

      const intervals = dayEvents
        .map((event) => event.interval)
        .filter((interval): interval is number => {
          return typeof interval === "number" && interval > 0;
        });

      const avgInterval =
        intervals.length > 0
          ? intervals.reduce((sum, interval) => sum + interval, 0) /
          intervals.length
          : 0;

      compressed.push({
        id: `${userId}_${cardId}_${day}`,
        userId,
        cardId,
        date: new Date(day),
        reviewCount: dayEvents.length,
        correctCount,
        avgInterval,
      });
    }

    return compressed;
  };
}



export { HistoryCompressionService };
