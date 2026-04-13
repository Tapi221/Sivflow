import type {
  ICloudSyncAdapter,
  SyncChange,
} from "@/services/interfaces/ISyncService";
import {
  pullCloudSyncDiff,
  pullCloudSyncFull,
  pushCloudSyncBatch,
} from "@/infrastructure/sync/cloudSyncFirestoreAdapter";

export class CloudSyncAdapter implements ICloudSyncAdapter {
  private readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  pullDiff = async (
    since: number,
  ): Promise<{ changes: SyncChange[]; serverTime: number }> =>
    pullCloudSyncDiff(this.userId, since);

  pushBatch = async (
    changes: SyncChange[],
  ): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown }> =>
    pushCloudSyncBatch(this.userId, changes);

  pullFull = async (entityIds: string[]): Promise<SyncChange[]> =>
    pullCloudSyncFull(this.userId, entityIds);
}
