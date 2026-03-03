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

    type TagRecord = { name: string; color: string; userId: string; rootFolderId: string; updatedAt: Date; [key: string]: unknown };
    const consolidatedMap = new Map<string, TagRecord>();
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

    await cards.toCollection().modify((c: unknown) => {
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
    await cards.toCollection().modify((c: unknown) => {
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
    await documents.toCollection().modify((d: unknown) => {
      if (typeof d.localUrl === 'string' && d.localUrl.startsWith('blob:')) {
        d.localUrl = null;
      }
      if (typeof d.blobUrl === 'string' && d.blobUrl.startsWith('blob:')) {
        d.blobUrl = null;
      }
    });
  });

  // Version 20: tags_v3 (ID主体のタグエンティティ) + card.tagIds 移行
  db.version(20).stores({
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
    // 🚀 NEW: ID主体タグテーブル
    tags_v3: 'id, userId, [userId+nameLower], updatedAt',
    studyLogs: 'id, userId, cardId, studiedAt',
    metadata: 'key',
    images: 'id, userId, status, [userId+status]',
    cardRelations: 'id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]',
    projectMaps: 'id, userId, folderId, updatedAt, [userId+updatedAt]',
  }).upgrade(async tx => {
    const genId = (): string => {
      if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
      return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    };

    // Step 1: tags_v2 → tags_v3 へ移行（idempotent）
    // nameLower で重複統合。既に tags_v3 に存在する [userId+nameLower] はスキップ。
    type V2Row = { id?: string; name: string; color: string; userId: string; updatedAt: Date; categoryId?: string; parentId?: string };
    type V3Row = { id: string; name: string; nameLower: string; color: string; userId: string; updatedAt: Date; categoryId?: 'subject' | 'exam' | 'difficulty' | 'type'; parentId?: string };

    const v2Table = tx.table('tags_v2');
    const v3Table = tx.table('tags_v3');

    // 既存 tags_v3 を nameLower でインデックス化（idempotent 保証）
    const existingV3Rows: V3Row[] = await v3Table.toArray();
    const existingKeys = new Set<string>(); // `${userId}__${nameLower}`
    for (const r of existingV3Rows) {
      existingKeys.add(`${r.userId}__${r.nameLower}`);
    }

    // tags_v2 を userId+nameLower で重複統合しながら投入
    const toAdd: V3Row[] = [];
    const seenInBatch = new Set<string>(); // 同バッチ内の重複も除去

    await v2Table.each((raw: unknown) => {
      const r = raw as V2Row;
      if (!r.name || !r.userId) return;
      const nameLower = r.name.toLowerCase();
      const key = `${r.userId}__${nameLower}`;
      if (existingKeys.has(key) || seenInBatch.has(key)) return;
      seenInBatch.add(key);

      const v3: V3Row = {
        id: r.id ?? genId(),
        name: r.name,
        nameLower,
        color: r.color ?? '',
        userId: r.userId,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt ?? 0),
      };
      if (r.categoryId === 'subject' || r.categoryId === 'exam' || r.categoryId === 'difficulty' || r.categoryId === 'type') {
        v3.categoryId = r.categoryId;
      }
      if (r.parentId) v3.parentId = r.parentId;
      toAdd.push(v3);
    });

    if (toAdd.length > 0) {
      await v3Table.bulkAdd(toAdd);
    }

    // Step 2: cards の tags(string[]) → tagIds(string[]) 移行
    // tags_v3 の nameLower → id マップを構築
    const allV3: V3Row[] = await v3Table.toArray();
    const nameLowerToId = new Map<string, string>(); // `${userId}__${nameLower}` → id
    for (const v of allV3) {
      nameLowerToId.set(`${v.userId}__${v.nameLower}`, v.id);
    }

    // カードを cursor で処理（全件メモリロードなし）
    const cardsTable = tx.table('cards');
    const newTags: V3Row[] = [];
    const cardPatches: Array<{ id: string; tagIds: string[] }> = [];

    await cardsTable.each((raw: unknown) => {
      const c = raw as { id: string; userId: string; tags?: unknown; tagIds?: unknown };
      if (!c.userId) return;

      const existingTagIds = Array.isArray(c.tagIds)
        ? (c.tagIds as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];

      const nameTags = Array.isArray(c.tags)
        ? (c.tags as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];

      if (nameTags.length === 0) return; // 処理不要

      const resolvedIds = new Set(existingTagIds);

      for (const tagName of nameTags) {
        const nl = tagName.toLowerCase();
        const key = `${c.userId}__${nl}`;
        let tagId = nameLowerToId.get(key);
        if (!tagId) {
          // tags_v3 に無い場合は新規作成
          tagId = genId();
          const newTag: V3Row = {
            id: tagId,
            name: tagName,
            nameLower: nl,
            color: '',
            userId: c.userId,
            updatedAt: new Date(),
          };
          newTags.push(newTag);
          nameLowerToId.set(key, tagId);
        }
        resolvedIds.add(tagId);
      }

      const newTagIds = Array.from(resolvedIds);
      // 変化がある場合のみパッチ
      const changed =
        newTagIds.length !== existingTagIds.length ||
        newTagIds.some(id => !existingTagIds.includes(id));
      if (changed) {
        cardPatches.push({ id: c.id, tagIds: newTagIds });
      }
    });

    // 新規タグをバルク追加（idempotent: 存在するものは add スキップ、put で上書きしない）
    if (newTags.length > 0) {
      await v3Table.bulkAdd(newTags, { allKeys: false });
    }

    // カードをバッチ更新（chunk 100件）
    const CHUNK = 100;
    for (let i = 0; i < cardPatches.length; i += CHUNK) {
      const chunk = cardPatches.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(p => cardsTable.update(p.id, { tagIds: p.tagIds, updatedAt: new Date() }))
      );
    }

    console.log(`[Migration v20] tags_v3: ${toAdd.length} added, cards patched: ${cardPatches.length}`);
  });
};
