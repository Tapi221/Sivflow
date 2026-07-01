const currentStores = {
  folders:
    "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
  cardSets:
    "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
  cards:
    "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], [cardSetId+isDeleted], *tagIds",
  documents:
    "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
  notes:
    "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
  users: "id, userId, updatedAt",
  userSettings: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
  userStats: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
  syncMetadata: "userId, deviceId",
  levelHistories: "id, userId, cardId, changedAt",
  deviceMeta: "deviceId, userId",
  syncErrors: "id, occurredAt, phase, retryable",
  syncHistory: "id, finishedAt",
  syncSettings: "id",
  syncQueue:
    "id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey",
  conflicts: "id, entityId",
  tagRecords:
    "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
  studyLogs: "id, userId, cardId, studiedAt",
  metadata: "key",
  images: "id, userId, status, [userId+status]",
  cardRelations:
    "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
  projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
  documentFiles: "id, updatedAt",
  tags: null,
  tags_v2: null,
  tags_v3: null,
} as const;



type SchemaTarget = {
  version: (versionNumber: number) => {
    stores: (schema: typeof currentStores) => unknown;
  };
};



const defineSchema = (db: SchemaTarget): void => {
  db.version(34).stores(currentStores);
};



export { defineSchema };
