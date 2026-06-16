const SYNC_STORES = { syncMetadata: "userId, deviceId", levelHistories: "id, userId, cardId, changedAt", deviceMeta: "deviceId, userId", syncErrors: "id, occurredAt, phase, retryable", syncHistory: "id, finishedAt", syncSettings: "id", syncQueue: "id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey", conflicts: "id, entityId" };



export { SYNC_STORES };
