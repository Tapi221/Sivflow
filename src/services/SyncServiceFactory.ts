// src/services/SyncServiceFactory.ts

import { flags } from "../features/flags";
import { SyncService } from "./syncService"; // Legacy
import { SyncServiceV2 } from "./SyncServiceV2";
import { QueueManager } from "./logic/QueueManager";
import { NetworkMonitor } from "./logic/NetworkMonitor";
import { DiffEngine } from "./logic/DiffEngine";
import { CloudSyncAdapter } from "./logic/CloudSyncAdapter";
import { TelemetryService } from "./logic/TelemetryService";
import {
  getLocalDb,
  getLocalDBTelemetrySnapshot,
  telemetryOncePerSession,
} from "./localDB";
import type { ISyncService } from "./interfaces/ISyncService";

/**
 * SyncServiceFactory
 * Feature Flagに基づいて、適切なSyncServiceのインスタンスを生成・返却する
 */
export class SyncServiceFactory {
  private static instances = new Map<string, ISyncService>();

  public static async getInstance(userId: string): Promise<ISyncService> {
    const existing = SyncServiceFactory.instances.get(userId);
    if (existing) return existing;

    const instance = await this.createInstance(userId);

    SyncServiceFactory.instances.set(userId, instance);
    return instance;
  }

  private static async createInstance(userId: string): Promise<ISyncService> {
    if (flags.isEnabled("USE_SYNC_V2")) {
      return await this.createV2(userId);
    }

    console.log("[SyncServiceFactory] Initializing Legacy SyncService");

    const db = await getLocalDb(userId);
    const legacy = new SyncService(userId, db);

    // ✅ ここが A 案の本体：Legacy が欠けてたら V2 にフォールバック
    // NOTE: mustHave は "実際に呼ばれる可能性があるメソッド" を必須にする
    const mustHave = [
      "getQueueStatus",
      // ↓ ここはあなたの ISyncService / AuthContext の実装に合わせて揃える
      // 'synchronize',
      // 'performStartupSync',
      // 'forceFullResync',
    ] as const;

    const legacyObj = legacy as unknown as Record<string, unknown>;
    const missing = mustHave.filter((k) => typeof legacyObj[k] !== "function");

    if (missing.length > 0) {
      const msg =
        `[SyncServiceFactory] Legacy SyncService is missing methods: ${missing.join(", ")}. ` +
        `Falling back to SyncService V2.`;

      // DEV は早めに気付けるようにしておく（ただし “Aでいく” なら本番は死なせない）
      if (import.meta.env.DEV) {
        // throw したい派ならここを throw に変えてもいいが、今は「落ちない」を優先
        console.error(msg);
      } else {
        console.error(msg);
      }

      return await this.createV2(userId);
    }

    return legacy as unknown as ISyncService;
  }

  private static async createV2(userId: string): Promise<ISyncService> {
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
  }

  public static resetInstance(userId?: string): void {
    if (userId) {
      SyncServiceFactory.instances.delete(userId);
      return;
    }
    SyncServiceFactory.instances.clear();
  }
}
