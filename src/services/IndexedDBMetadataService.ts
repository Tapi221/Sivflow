import type { LocalDBLike } from "./localDB";
import type { IndexedDBMetadata } from "@/types/domain/storage";
import { CURRENT_SCHEMA_VERSION } from "@/types/domain/storage";
import { SafeIndexedDBWriter } from "./SafeIndexedDBWriter";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const toDate = (value: unknown, fallback: Date): Date => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date;
  }
  return fallback;
};

const toStorageState = (
  value: unknown,
): IndexedDBMetadata["storageState"] => {
  return value === "DIRTY" ? "DIRTY" : "CLEAN";
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
};

const normalizeMetadata = (
  value: unknown,
): IndexedDBMetadata | null => {
  if (!isRecord(value)) return null;

  const rawExpected = isRecord(value.expectedEntityCounts)
    ? value.expectedEntityCounts
    : {};

  return {
    key: "main",
    schemaVersion: toFiniteNumber(value.schemaVersion, CURRENT_SCHEMA_VERSION),
    lastFullSyncAt: toDate(value.lastFullSyncAt, new Date()),
    expectedEntityCounts: {
      cards: toFiniteNumber(rawExpected.cards, 0),
      folders: toFiniteNumber(rawExpected.folders, 0),
      events: toFiniteNumber(rawExpected.events, 0),
    },
    storageState: toStorageState(value.storageState),
    rebuildCount: toFiniteNumber(value.rebuildCount, 0),
    rebuildReason: toOptionalString(value.rebuildReason),
  };
};

export class IndexedDBMetadataService {
  private readonly db: LocalDBLike;
  private readonly userId: string;

  constructor(db: LocalDBLike, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  private readonly recomputeMetadata = async (reason: string): Promise<void> => {
    const cardCount = await this.db.cards.count();
    const folderCount = await this.db.folders.count();
    const eventCount = await this.db.levelHistories.count();
    const current = normalizeMetadata(await this.db.metadata.get("main"));

    const next: IndexedDBMetadata = {
      key: "main",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastFullSyncAt: current?.lastFullSyncAt ?? new Date(),
      expectedEntityCounts: {
        cards: cardCount,
        folders: folderCount,
        events: eventCount,
      },
      storageState: current?.storageState ?? "CLEAN",
      rebuildCount: current?.rebuildCount ?? 0,
      rebuildReason: current?.rebuildReason,
    };

    await SafeIndexedDBWriter.write(
      this.userId,
      () => this.db.metadata.put(next as unknown as Record<string, unknown>),
      "recomputeMetadata",
    );

    console.log("[HealthCheck] healthcheck_metadata_recomputed", {
      userId: this.userId,
      reason,
      counts: next.expectedEntityCounts,
    });
  };

  public readonly recomputeMetadataFor = async (reason: string): Promise<void> => {
    await this.recomputeMetadata(reason);
  };

  public readonly markClean = async (): Promise<void> => {
    const meta: IndexedDBMetadata = {
      key: "main",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastFullSyncAt: new Date(),
      expectedEntityCounts: {
        cards: await this.db.cards.count(),
        folders: await this.db.folders.count(),
        events: await this.db.levelHistories.count(),
      },
      storageState: "CLEAN",
      rebuildCount: 0,
    };

    await SafeIndexedDBWriter.write(
      this.userId,
      () => this.db.metadata.put(meta as unknown as Record<string, unknown>),
      "markClean",
    );

    const saved = await this.db.metadata.get("main");
    console.log(`[Metadata:${this.userId}] Marked CLEAN`);
    console.log(`[Metadata:${this.userId}] Verification - saved metadata:`, saved);
  };

  public readonly markDirty = async (): Promise<void> => {
    const rawMeta = await this.db.metadata.get("main");
    const meta = normalizeMetadata(rawMeta);

    if (!meta) return;

    meta.storageState = "DIRTY";

    await SafeIndexedDBWriter.write(
      this.userId,
      () => this.db.metadata.put(meta as unknown as Record<string, unknown>),
      "markDirty",
    );

    console.log(`[Metadata:${this.userId}] Marked DIRTY`);
  };

  public readonly checkHealth = async (): Promise<{
    healthy: boolean;
    reason?: string;
  }> => {
    const meta = normalizeMetadata(await this.db.metadata.get("main"));

    if (!meta) {
      console.warn(
        `[Metadata:${this.userId}] Missing metadata detected. Creating default metadata to avoid destructive rebuild.`,
      );

      try {
        await this.markClean();
        const created = await this.db.metadata.get("main");
        console.log(`[Metadata:${this.userId}] Created metadata:`, created);
        return { healthy: true };
      } catch (error) {
        console.error(
          `[Metadata:${this.userId}] Failed to create metadata during health check`,
          error,
        );
        return { healthy: false, reason: "missing_metadata" };
      }
    }

    if (meta.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      return {
        healthy: false,
        reason: `schema_mismatch (expected: ${CURRENT_SCHEMA_VERSION}, got: ${meta.schemaVersion})`,
      };
    }

    if (meta.storageState === "DIRTY") {
      return { healthy: false, reason: "dirty_shutdown" };
    }

    if (meta.rebuildCount > 3) {
      return {
        healthy: false,
        reason: `rebuild_loop (count: ${meta.rebuildCount})`,
      };
    }

    const actualCardCount = await this.db.cards.count();
    const expectedCardCount = meta.expectedEntityCounts.cards;
    const diff = Math.abs(actualCardCount - expectedCardCount);

    if (diff > 0) {
      console.warn(
        `[HealthCheck] Card count mismatch detected. Expected: ${expectedCardCount}, Actual: ${actualCardCount}`,
      );

      if (expectedCardCount === 0 && actualCardCount > 0) {
        try {
          await this.recomputeMetadata("expected_zero_actual_positive");
          return { healthy: true };
        } catch (error) {
          console.error(
            "[HealthCheck] metadata recompute failed for expected=0 mismatch",
            error,
          );
          return {
            healthy: false,
            reason: `metadata_recompute_failed (cards: expected ${expectedCardCount}, got ${actualCardCount})`,
          };
        }
      }

      if (diff <= 10) {
        console.log(
          "[HealthCheck] Mismatch is within tolerance. Auto-correcting metadata...",
        );

        try {
          await this.markClean();
          return { healthy: true };
        } catch (error) {
          console.error("[HealthCheck] Failed to auto-correct metadata", error);
          return {
            healthy: false,
            reason: `count_mismatch_autofix_failed (diff: ${diff})`,
          };
        }
      }

      return {
        healthy: false,
        reason: `count_mismatch (cards: expected ${expectedCardCount}, got ${actualCardCount})`,
      };
    }

    return { healthy: true };
  };

  public readonly incrementRebuildCount = async (
    reason: string,
  ): Promise<void> => {
    const meta = normalizeMetadata(await this.db.metadata.get("main"));
    if (!meta) return;

    meta.rebuildCount = (meta.rebuildCount || 0) + 1;
    meta.rebuildReason = reason;

    await SafeIndexedDBWriter.write(
      this.userId,
      () => this.db.metadata.put(meta as unknown as Record<string, unknown>),
      "incrementRebuildCount",
    );

    console.warn(
      `[Metadata:${this.userId}] Rebuild count: ${meta.rebuildCount}, reason: ${reason}`,
    );
  };

  public readonly getRebuildCount = async (): Promise<number> => {
    const meta = normalizeMetadata(await this.db.metadata.get("main"));
    return meta?.rebuildCount || 0;
  };
}
