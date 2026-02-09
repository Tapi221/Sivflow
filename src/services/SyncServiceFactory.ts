import { flags } from '../features/flags';
import { SyncService } from './syncService'; // Legacy
import { SyncServiceV2 } from './SyncServiceV2';
import { QueueManager } from './logic/QueueManager';
import { NetworkMonitor } from './logic/NetworkMonitor';
import { DiffEngine } from './logic/DiffEngine';
import { CloudSyncAdapter } from './logic/CloudSyncAdapter';
import { TelemetryService } from './logic/TelemetryService';
import { getLocalDb } from './localDB';
import type { ISyncService } from './interfaces/ISyncService';
import type { SyncContextSource } from '../types/telemetry';

/**
 * SyncServiceFactory
 * Feature Flagに基づいて、適切なSyncServiceのインスタンスを生成・返却する
 */
export class SyncServiceFactory {
  private static instance: ISyncService | null = null;

  public static async getInstance(userId: string): Promise<any> {
    if (SyncServiceFactory.instance) {
      return SyncServiceFactory.instance;
    }

    if (flags.isEnabled('USE_SYNC_V2')) {
      console.log('[SyncServiceFactory] Initializing SyncService V2');
      
      const db = await getLocalDb(userId);
      const queueManager = new QueueManager(db);
      const networkMonitor = new NetworkMonitor();
      const diffEngine = new DiffEngine();
      const cloudAdapter = new CloudSyncAdapter(userId);
      const telemetry = new TelemetryService();

      SyncServiceFactory.instance = new SyncServiceV2(
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
      SyncServiceFactory.instance = new SyncService(userId, db) as any;
    }

    return SyncServiceFactory.instance;
  }
}
