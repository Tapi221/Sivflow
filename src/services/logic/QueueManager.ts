import { createQueueItemFromSyncTask, queueItemToSyncTask } from "@/application/usecases/syncQueueItemFactory";
import type { BatchConstraint, IQueueManager, SyncTask } from "@/services/interfaces/ISyncService";
import type { LocalDBLike } from "@/services/localdb";
import type { SyncQueueItem } from "@/types/domain/sync";

type QueueReadableLocalDB = Omit<LocalDBLike, "getItem