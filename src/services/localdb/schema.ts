import type { LocalDB } from './LocalDB';

export const defineSchema = (db: LocalDB): void => {
  db.version(1).stores({
    folders: 'id, userId, parentFolderId, updatedAt',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt',
    userStats: 'id, userId, updatedAt',
    syncMetadata: 'userId',
  });

  db.version(2).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt',
    userStats: 'id, userId, updatedAt',
    syncMetadata: 'userId',
  });

  db.version(3).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt',
    userStats: 'id, userId, updatedAt',
    syncMetadata: 'userId',
    levelHistories: 'id, userId, cardId, changedAt',
  });

  db.version(4).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt',
    userStats: 'id, userId, updatedAt',
    syncMetadata: 'userId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
  });

  db.version(5).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt',
    userStats: 'id, userId, updatedAt',
    syncMetadata: 'userId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, createdAt, action',
    conflicts: 'id, entityId',
  });

  db.version(6).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt',
    userStats: 'id, userId, updatedAt',
    syncMetadata: 'userId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, createdAt, action',
    conflicts: 'id, entityId',
    tags: 'name, userId, updatedAt',
  });

  db.version(7).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt',
    userStats: 'id, userId, updatedAt',
    syncMetadata: 'userId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, createdAt, action',
    conflicts: 'id, entityId',
    tags: null,
  });

  db.version(10).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, createdAt, action',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
  });

  // Version 11: メタデータテーブル追加（ブラウザストレージ設計準拠）
  db.version(11).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, createdAt, action',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key', // 🔥 新規追加: IndexedDB 健全性管理用
  });

  // Version 12: 画像テーブル追加 (Phase 2 Upload Support)
  db.version(12).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, createdAt, action',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]', // 🔥 新規追加
  });

  // Version 13: Map Feature Tables
  db.version(13).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, createdAt, action',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]',
    cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
    projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
  });

  // Version 14: Fix SyncQueue Schema (Add status index)
  db.version(14).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, createdAt, action, status', // 🔥 Added status
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]',
    cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
    projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
  });

  // Version 15: Enhance SyncQueue for OperationQueueService (Rev.5)
  db.version(15).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    // Schema Update: Add indices for efficient querying (targetId, priority, composite indices)
    syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]',
    cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
    projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
  });

  // Version 16: Globalize tags (Unified across all folders)
  db.version(16).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt', // 🛠️ Reverted PK to fix Dexie UpgradeError
    tags_v2: '[userId+name], userId, updatedAt', // 🚀 NEW Global Tags table
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]',
    cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
    projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
  }).upgrade(async tx => {
    // Tag consolidation migration: old tags -> tags_v2
    const oldTags = await tx.table('tags').toArray();
    if (oldTags.length === 0) return;

    const consolidatedMap = new Map<string, any>();
    oldTags.forEach(tag => {
        const key = `${tag.userId}_${tag.name}`;
        const existing = consolidatedMap.get(key);
        if (!existing || new Date(tag.updatedAt) > new Date(existing.updatedAt)) {
            consolidatedMap.set(key, { ...tag, rootFolderId: 'GLOBAL' });
        }
    });

    // Clear new table first if it's already used or for safety
    await tx.table('tags_v2').clear();
    await tx.table('tags_v2').bulkAdd(Array.from(consolidatedMap.values()));
    console.log(`[Migration] Consolidated ${oldTags.length} tags into ${consolidatedMap.size} global tags in tags_v2.`);
  });

  // Version 17: Documents (PDF) support
  db.version(17).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]',
    documents: 'id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]', // ✅追加
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    tags_v2: '[userId+name], userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]',
    cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
    projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
  }).upgrade(async tx => {
    // 既存カードに difficulty / reviewCount が無い場合は補完する（破壊的変更なし）
    const cards = tx.table('cards');

    await cards.toCollection().modify((c: any) => {
      if (typeof c.difficulty !== 'number' || !Number.isFinite(c.difficulty)) {
        c.difficulty = 0.35; // 初期値（安全寄り）
      } else {
        // clamp 0..1
        c.difficulty = Math.max(0, Math.min(1, c.difficulty));
      }

      if (typeof c.reviewCount !== 'number' || !Number.isFinite(c.reviewCount)) {
        c.reviewCount = c.review_count ?? 0;
      }
    });
  });

  // Version 18: cards difficulty / reviewCount index追加（正しいマイグレーション）
  db.version(18).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]',
    documents: 'id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    tags_v2: '[userId+name], userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]',
    cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
    projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
  }).upgrade(async tx => {
    const cards = tx.table('cards');
    await cards.toCollection().modify((c: any) => {
      if (typeof c.difficulty !== 'number' || !Number.isFinite(c.difficulty)) c.difficulty = 0.35;
      c.difficulty = Math.max(0, Math.min(1, c.difficulty));
      if (typeof c.reviewCount !== 'number' || !Number.isFinite(c.reviewCount)) {
        c.reviewCount = c.review_count ?? 0;
      }
    });
  });

  // Version 19: documents.localUrl/blobUrl の stale blob URL を正規化
  db.version(19).stores({
    folders: 'id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]',
    cards: 'id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]',
    documents: 'id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]',
    users: 'id, userId, updatedAt',
    userSettings: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    userStats: 'id, userId, updatedAt, isDeleted, [userId+updatedAt]',
    syncMetadata: 'userId, deviceId',
    levelHistories: 'id, userId, cardId, changedAt',
    deviceMeta: 'deviceId, userId',
    syncErrors: 'id, occurredAt, phase, retryable',
    syncHistory: 'id, finishedAt',
    syncSettings: 'id',
    syncQueue: 'id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey',
    conflicts: 'id, entityId',
    tags: '[rootFolderId+name], rootFolderId, userId, updatedAt',
    tags_v2: '[userId+name], userId, updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]',
    cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
    projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
  }).upgrade(async tx => {
    const documents = tx.table('documents');
    await documents.toCollection().modify((d: any) => {
      if (typeof d.localUrl === 'string' && d.localUrl.startsWith('blob:')) {
        d.localUrl = null;
      }
      if (typeof d.blobUrl === 'string' && d.blobUrl.startsWith('blob:')) {
        d.blobUrl = null;
      }
    });
  });
};
