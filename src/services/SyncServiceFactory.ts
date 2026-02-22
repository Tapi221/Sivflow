import { flags } from '../features/flags';
import { SyncService } from './syncService'; // Legacy
import { SyncServiceV2 } from './SyncServiceV2';
import { QueueManager } from './logic/QueueManager';
import { NetworkMonitor } from './logic/NetworkMonitor';
import { DiffEngine } from './logic/DiffEngine';
import { CloudSyncAdapter } from './logic/CloudSyncAdapter';
import { TelemetryService } from './logic/TelemetryService';
import { getLocalDb, getLocalDBTelemetrySnapshot, telemetryOncePerSession } from './localDB';
import type { ISyncService } from './interfaces/ISyncService';
import type { SyncContextSource } from '../types/telemetry';

/**
 * SyncServiceFactory
 * Feature Flagに基づいて、適切なSyncServiceのインスタンスを生成・返却する
 */
export class SyncServiceFactory {
  private static instances = new Map<string, ISyncService>();

  public static async getInstance(userId: string): Promise<ISyncService> {
    const existing = SyncServiceFactory.instances.get(userId);
    if (existing) {
      return existing;
    }

    let instance: ISyncService;

    if (flags.isEnabled('USE_SYNC_V2')) {
      console.log('[SyncServiceFactory] Initializing SyncService V2');
      
      const db = await getLocalDb(userId);
      const queueManager = new QueueManager(db);
      const networkMonitor = new NetworkMonitor();
      const diffEngine = new DiffEngine();
      const cloudAdapter = new CloudSyncAdapter(userId);
      const telemetry = new TelemetryService();
      if (telemetryOncePerSession('localdb_runtime')) {
        const localDbTelemetry = getLocalDBTelemetrySnapshot();
        telemetry.recordMetric('localdb_runtime', 1, {
          localdb_mode: localDbTelemetry.localdb_mode,
          localdb_reason_code: localDbTelemetry.localdb_reason_code,
          localdb_fallback_reason: localDbTelemetry.localdb_fallback_reason,
          localdb_generation_bumped: String(localDbTelemetry.localdb_generation_bumped),
          localdb_reset_failed: String(localDbTelemetry.localdb_reset_failed),
        });
      }

      instance = new SyncServiceV2(
        userId,
        db,
        queueManager,
        networkMonitor,
        diffEngine,
        cloudAdapter,
        telemetry
      );
    } else {
      console.log('[SyncServiceFactory] Initializing Legacy SyncService');
      const db = await getLocalDb(userId);
      instance = new SyncService(userId, db);
    }

    SyncServiceFactory.instances.set(userId, instance);
    return instance;
  }

  public static resetInstance(userId?: string): void {
    if (userId) {
      SyncServiceFactory.instances.delete(userId);
      return;
    }
    SyncServiceFactory.instances.clear();
  }
}
