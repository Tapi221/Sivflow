import { flags } from "@/features/flags";
import type { ISyncService } from "./interfaces/ISyncService";
import {
  getLocalDb,
  getLocalDBTelemetrySnapshot,
  telemetryOncePerSession,
} from "./localDB";
import { CloudSyncAdapter } from "./logic/CloudSyncAdapter";
import { DiffEngine } from "./logic/DiffEngine";
import { NetworkMonitor } from "./logic/NetworkMonitor";
import { QueueManager } from "./logic/QueueManager";
import { TelemetryService } from "./logic/TelemetryService";
import { SyncService } from "./syncService";
import { SyncServiceV2 } from "./SyncServiceV2";

export class SyncServiceFactory {
  private static instances = new Map<string, ISyncService>();
  private static pendingInstances = new Map<string, Promise<ISyncService>>();
  private static warnedLegacyFallbackUsers = new Set<string>();

  public static getInstance = async (userId: string): Promise<ISyncService> => {
    const existing = SyncServiceFactory.instances.get(userId);
    if (existing) {
      return existing;
    }

    const pending = SyncServiceFactory.pendingInstances.get(userId);
    if (pending) {
      return pending;
    }

    const nextPromise = this.createInstance(userId)
      .then((instance) => {
        SyncServiceFactory.instances.set(userId, instance);
        return instance;
      })
      .finally(() => {
        SyncServiceFactory.pendingInstances.delete(userId);
      });

    SyncServiceFactory.pendingInstances.set(userId, nextPromise);

    return nextPromise;
  };

  private static createInstance = async (userId: string): Promise<ISyncService> => {
    if (flags.isEnabled("USE_SYNC_V2")) {
      return this.createV2(userId);
    }

    console.log("[SyncServiceFactory] Initializing Legacy SyncService");

    const db = await getLocalDb(userId);
    const legacy = new SyncService(userId, db);

    const mustHave = [
      "getQueueStatus",
      "monitorSecurity",
      "dismissSecurityAlert",
      "synchronize",
      "performFullSync",
      "processQueue",
      "loadSettings",
      "getUnresolvedConflicts",
      "updateDeviceName",
      "removeDevice",
      "cleanupInactiveDevices",
      "getSyncStats",
    ] as const;

    const legacyObj = legacy as unknown as Record<string, unknown>;
    const missing = mustHave.filter((key) => typeof legacyObj[key] !== "function");

    if (missing.length > 0) {
      if (!SyncServiceFactory.warnedLegacyFallbackUsers.has(userId)) {
        SyncServiceFactory.warnedLegacyFallbackUsers.add(userId);
        console.error(
          `[SyncServiceFactory] Legacy SyncService is missing methods: ${missing.join(", ")}. Falling back to SyncService V2.`,
        );
      }

      return this.createV2(userId);
    }

    return legacy as unknown as ISyncService;
  };

  private static createV2 = async (userId: string): Promise<ISyncService> => {
    console.log("[SyncServiceFactory] Initializing SyncService V2");

    const db = await getLocalDb(userId);
    const queueManager = new QueueManager(db);
    const networkMonitor = new NetworkMonitor();
    const diffEngine = new DiffEngine();
    const cloudAdapter = new CloudSyncAdapter(userId);
    const telemetry = new TelemetryService();

    if (telemetryOncePerSession("localdb_runtime")) {
      const localDbTelemetry = getLocalDBTelemetrySnapshot();
      telemetry.recordMetric("localdb_runtime", 1, {
        localdb_mode: localDbTelemetry.localdb_mode,
        localdb_reason_code: localDbTelemetry.localdb_reason_code,
        localdb_fallback_reason: localDbTelemetry.localdb_fallback_reason,
        localdb_generation_bumped: String(
          localDbTelemetry.localdb_generation_bumped,
        ),
        localdb_reset_failed: String(localDbTelemetry.localdb_reset_failed),
      });
    }

    return new SyncServiceV2(
      userId,
      db,
      queueManager,
      networkMonitor,
      diffEngine,
      cloudAdapter,
      telemetry,
    );
  };

  public static resetInstance = (userId?: string): void => {
    if (userId) {
      SyncServiceFactory.instances.delete(userId);
      SyncServiceFactory.pendingInstances.delete(userId);
      SyncServiceFactory.warnedLegacyFallbackUsers.delete(userId);
      return;
    }

    SyncServiceFactory.instances.clear();
    SyncServiceFactory.pendingInstances.clear();
    SyncServiceFactory.warnedLegacyFallbackUsers.clear();
  };
}