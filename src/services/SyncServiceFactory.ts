import type { ISyncService } from "./interfaces/ISyncService";
import { getLocalDb, getLocalDBTelemetrySnapshot, telemetryOncePerSession } from "./localDB";
import { CloudSyncAdapter } from "./logic/CloudSyncAdapter";
import { DiffEngine } from "./logic/DiffEngine";
import { NetworkMonitor } from "./logic/NetworkMonitor";
import { QueueManager } from "./logic/QueueManager";
import { TelemetryService } from "./logic/TelemetryService";
import { SyncServiceV2 } from "./SyncServiceV2";

import type { SyncContextSource } from "@/types/domain/telemetry";

class ResilientSyncService extends SyncServiceV2 {
  private isSyncRunActive = false;
  private shouldRunAgain = false;

  public override async sync(source: SyncContextSource): Promise<void> {
    if (this.isSyncRunActive) {
      this.shouldRunAgain = true;
      return;
    }

    this.isSyncRunActive = true;
    let nextSource: SyncContextSource = source;

    try {
      do {
        this.shouldRunAgain = false;
        const before = await this.getQueueStatus().catch(() => null);

        await super.sync(nextSource);

        const after = await this.getQueueStatus().catch(() => null);
        const madeProgress = Boolean(before && after && before.pending > after.pending);
        const hasMoreQueuedWork = Boolean(after && after.pending > 0);

        nextSource = "background";
        if (hasMoreQueuedWork && madeProgress) {
          this.shouldRunAgain = true;
        }
      } while (this.shouldRunAgain);
    } finally {
      this.isSyncRunActive = false;
    }
  }
}

export class SyncServiceFactory {
  private static instances = new Map<string, ISyncService>();
  private static pendingInstances = new Map<string, Promise<ISyncService>>();

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

  private static createInstance = async (
    userId: string,
  ): Promise<ISyncService> => {
    return this.createV2(userId);
  };

  private static createV2 = async (userId: string): Promise<ISyncService> => {
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

    return new ResilientSyncService(
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
      return;
    }

    SyncServiceFactory.instances.clear();
    SyncServiceFactory.pendingInstances.clear();
  };
}
