import type { LocalDB } from "./LocalDB";
import { getTagColorKey } from "@/lib/tags/tagColor";

export const defineSchema = (db: LocalDB): void => {
  db.version(1).stores({
    folders: "id, userId, parentFolderId, updatedAt",
    cards: "id, userId, folderId, updatedAt, nextReviewDate",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt",
    userStats: "id, userId, updatedAt",
    syncMetadata: "userId",
  });

  db.version(2).stores({
    folders: "id, userId, parentFolderId, updatedAt, cloudSyncEnabled",
    cards: "id, userId, folderId, updatedAt, nextReviewDate",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt",
    userStats: "id, userId, updatedAt",
    syncMetadata: "userId",
  });

  db.version(3).stores({
    folders: "id, userId, parentFolderId, updatedAt, cloudSyncEnabled",
    cards: "id, userId, folderId, updatedAt, nextReviewDate",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt",
    userStats: "id, userId, updatedAt",
    syncMetadata: "userId",
    levelHistories: "id, userId, cardId, changedAt",
  });

  db.version(4).stores({
    folders: "id, userId, parentFolderId, updatedAt, cloudSyncEnabled",
    cards: "id, userId, folderId, updatedAt, nextReviewDate",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt",
    userStats: "id, userId, updatedAt",
    syncMetadata: "userId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
  });

  db.version(5).stores({
    folders: "id, userId, parentFolderId, updatedAt, cloudSyncEnabled",
    cards: "id, userId, folderId, updatedAt, nextReviewDate",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt",
    userStats: "id, userId, updatedAt",
    syncMetadata: "userId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    syncQueue: "id, createdAt, action",
    conflicts: "id, entityId",
  });

  db.version(6).stores({
    folders: "id, userId, parentFolderId, updatedAt, cloudSyncEnabled",
    cards: "id, userId, folderId, updatedAt, nextReviewDate",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt",
    userStats: "id, userId, updatedAt",
    syncMetadata: "userId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    syncQueue: "id, createdAt, action",
    conflicts: "id, entityId",
    tags: "name, userId, updatedAt",
  });

  db.version(7).stores({
    folders: "id, userId, parentFolderId, updatedAt, cloudSyncEnabled",
    cards: "id, userId, folderId, updatedAt, nextReviewDate",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt",
    userStats: "id, userId, updatedAt",
    syncMetadata: "userId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    syncQueue: "id, createdAt, action",
    conflicts: "id, entityId",
    tags: null,
  });

  db.version(10).stores({
    folders:
      "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    cards:
      "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    userStats: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    syncMetadata: "userId, deviceId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    syncQueue: "id, createdAt, action",
    conflicts: "id, entityId",
    tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
    studyLogs: "id, userId, cardId, studiedAt",
  });

  // Version 11: メタデータテーブル追加（ブラウザストレージ設計準拠）
  db.version(11).stores({
    folders:
      "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    cards:
      "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    userStats: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    syncMetadata: "userId, deviceId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    syncQueue: "id, createdAt, action",
    conflicts: "id, entityId",
    tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
    studyLogs: "id, userId, cardId, studiedAt",
    metadata: "key", // 🔥 新規追加: IndexedDB 健全性管理用
  });

  // Version 12: 画像テーブル追加 (Phase 2 Upload Support)
  db.version(12).stores({
    folders:
      "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    cards:
      "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    userStats: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    syncMetadata: "userId, deviceId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    syncQueue: "id, createdAt, action",
    conflicts: "id, entityId",
    tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
    studyLogs: "id, userId, cardId, studiedAt",
    metadata: "key",
    images: "id, userId, status, [userId+status]", // 🔥 新規追加
  });

  // Version 13: Map Feature Tables
  db.version(13).stores({
    folders:
      "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    cards:
      "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    userStats: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    syncMetadata: "userId, deviceId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    syncQueue: "id, createdAt, action",
    conflicts: "id, entityId",
    tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
    studyLogs: "id, userId, cardId, studiedAt",
    metadata: "key",
    images: "id, userId, status, [userId+status]",
    cardRelations:
      "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
    projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
  });

  // Version 14: Fix SyncQueue Schema (Add status index)
  db.version(14).stores({
    folders:
      "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    cards:
      "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    userStats: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    syncMetadata: "userId, deviceId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    syncQueue: "id, createdAt, action, status", // 🔥 Added status
    conflicts: "id, entityId",
    tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
    studyLogs: "id, userId, cardId, studiedAt",
    metadata: "key",
    images: "id, userId, status, [userId+status]",
    cardRelations:
      "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
    projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
  });

  // Version 15: Enhance SyncQueue for OperationQueueService (Rev.5)
  db.version(15).stores({
    folders:
      "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    cards:
      "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    users: "id, userId, updatedAt",
    userSettings: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    userStats: "id, userId, updatedAt, isDeleted, [userId+updatedAt]",
    syncMetadata: "userId, deviceId",
    levelHistories: "id, userId, cardId, changedAt",
    deviceMeta: "deviceId, userId",
    syncErrors: "id, occurredAt, phase, retryable",
    syncHistory: "id, finishedAt",
    syncSettings: "id",
    // Schema Update: Add indices for efficient querying (targetId, priority, composite indices)
    syncQueue:
      "id, targetId, status, priority, [status+priority], [targetId+status], idempotencyKey, &migrationKey",
    conflicts: "id, entityId",
    tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
    studyLogs: "id, userId, cardId, studiedAt",
    metadata: "key",
    images: "id, userId, status, [userId+status]",
    cardRelations:
      "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
    projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
  });

  // Version 16: Globalize tags (Unified across all folders)
  db.version(16)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cards:
        "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, [userId+updatedAt], [userId+isDeleted]",
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt", // 🛠️ Reverted PK to fix Dexie UpgradeError
      tags_v2: "[userId+name], userId, updatedAt", // 🚀 NEW Global Tags table
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      // Tag consolidation migration: old tags -> tags_v2
      const oldTags = await tx.table("tags").toArray();
      if (oldTags.length === 0) return;

      type TagRecord = {
        name: string;
        color: string;
        userId: string;
        rootFolderId: string;
        updatedAt: Date;
        [key: string]: unknown;
      };
      const consolidatedMap = new Map<string, TagRecord>();
      oldTags.forEach((tag) => {
        const key = `${tag.userId}_${tag.name}`;
        const existing = consolidatedMap.get(key);
        if (
          !existing ||
          new Date(tag.updatedAt) > new Date(existing.updatedAt)
        ) {
          consolidatedMap.set(key, { ...tag, rootFolderId: "GLOBAL" });
        }
      });

      // Clear new table first if it's already used or for safety
      await tx.table("tags_v2").clear();
      await tx.table("tags_v2").bulkAdd(Array.from(consolidatedMap.values()));
      console.log(
        `[Migration] Consolidated ${oldTags.length} tags into ${consolidatedMap.size} global tags in tags_v2.`,
      );
    });

  // Version 17: Documents (PDF) support
  db.version(17)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cards:
        "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]",
      documents:
        "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]", // ✅追加
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      // 既存カードに difficulty / reviewCount が無い場合は補完する（破壊的変更なし）
      const cards = tx.table("cards");

      await cards.toCollection().modify((c: unknown) => {
        if (
          typeof c.difficulty !== "number" ||
          !Number.isFinite(c.difficulty)
        ) {
          c.difficulty = 0.35; // 初期値（安全寄り）
        } else {
          // clamp 0..1
          c.difficulty = Math.max(0, Math.min(1, c.difficulty));
        }

        if (
          typeof c.reviewCount !== "number" ||
          !Number.isFinite(c.reviewCount)
        ) {
          c.reviewCount = c.review_count ?? 0;
        }
      });
    });

  // Version 18: cards difficulty / reviewCount index追加（正しいマイグレーション）
  db.version(18)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cards:
        "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const cards = tx.table("cards");
      await cards.toCollection().modify((c: unknown) => {
        if (typeof c.difficulty !== "number" || !Number.isFinite(c.difficulty))
          c.difficulty = 0.35;
        c.difficulty = Math.max(0, Math.min(1, c.difficulty));
        if (
          typeof c.reviewCount !== "number" ||
          !Number.isFinite(c.reviewCount)
        ) {
          c.reviewCount = c.review_count ?? 0;
        }
      });
    });

  // Version 19: documents.localUrl/blobUrl の stale blob URL を正規化
  db.version(19)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cards:
        "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const documents = tx.table("documents");
      await documents.toCollection().modify((d: unknown) => {
        if (typeof d.localUrl === "string" && d.localUrl.startsWith("blob:")) {
          d.localUrl = null;
        }
        if (typeof d.blobUrl === "string" && d.blobUrl.startsWith("blob:")) {
          d.blobUrl = null;
        }
      });
    });

  // Version 20: tags_v3 (ID主体のタグエンティティ) + card.tagIds 移行
  db.version(20)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cards:
        "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate]",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      // 🚀 NEW: ID主体タグテーブル
      tags_v3: "id, userId, [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const genId = (): string => {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto)
          return crypto.randomUUID();
        return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      };

      // Step 1: tags_v2 → tags_v3 へ移行（idempotent）
      // nameLower で重複統合。既に tags_v3 に存在する [userId+nameLower] はスキップ。
      type V2Row = {
        id?: string;
        name: string;
        color: string;
        userId: string;
        updatedAt: Date;
        categoryId?: string;
        parentId?: string;
      };
      type V3Row = {
        id: string;
        name: string;
        nameLower: string;
        color: string;
        userId: string;
        updatedAt: Date;
        categoryId?: "subject" | "exam" | "difficulty" | "type";
        parentId?: string;
      };

      const v2Table = tx.table("tags_v2");
      const v3Table = tx.table("tags_v3");

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
          color: r.color ?? "",
          userId: r.userId,
          updatedAt:
            r.updatedAt instanceof Date
              ? r.updatedAt
              : new Date(r.updatedAt ?? 0),
        };
        if (
          r.categoryId === "subject" ||
          r.categoryId === "exam" ||
          r.categoryId === "difficulty" ||
          r.categoryId === "type"
        ) {
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
      const cardsTable = tx.table("cards");
      const newTags: V3Row[] = [];
      const cardPatches: Array<{ id: string; tagIds: string[] }> = [];

      await cardsTable.each((raw: unknown) => {
        const c = raw as {
          id: string;
          userId: string;
          tags?: unknown;
          tagIds?: unknown;
        };
        if (!c.userId) return;

        const existingTagIds = Array.isArray(c.tagIds)
          ? (c.tagIds as unknown[]).filter(
              (x): x is string => typeof x === "string",
            )
          : [];

        const nameTags = Array.isArray(c.tags)
          ? (c.tags as unknown[]).filter(
              (x): x is string => typeof x === "string",
            )
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
              color: "",
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
          newTagIds.some((id) => !existingTagIds.includes(id));
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
          chunk.map((p) =>
            cardsTable.update(p.id, {
              tagIds: p.tagIds,
              updatedAt: new Date(),
            }),
          ),
        );
      }

      console.log(
        `[Migration v20] tags_v3: ${toAdd.length} added, cards patched: ${cardPatches.length}`,
      );
    });

  // Version 21: cards.tagIds に multiEntry index を追加（usage count 高速化）
  db.version(21)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cards:
        "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], *tagIds",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      tags_v3: "id, userId, [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const cards = tx.table("cards");
      await cards.toCollection().modify((raw: unknown) => {
        const card = raw as { tagIds?: unknown };
        if (card.tagIds === undefined) {
          card.tagIds = [];
        }
      });
    });

  // Version 22: tags_v3 に parentId index を追加
  db.version(22).stores({
    folders:
      "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
    cards:
      "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], *tagIds",
    documents:
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
    tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
    tags_v2: "[userId+name], userId, updatedAt",
    tags_v3:
      "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
    studyLogs: "id, userId, cardId, studiedAt",
    metadata: "key",
    images: "id, userId, status, [userId+status]",
    cardRelations:
      "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
    projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
  });

  db.version(23)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cards:
        "id, userId, folderId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], *tagIds",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      tags_v3:
        "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      // legacy互換: class文字列保存を colorKey に正規化
      const tagsTable = tx.table("tags_v3");
      await tagsTable.toCollection().modify((raw: unknown) => {
        const tag = raw as { color?: string };
        tag.color = getTagColorKey(tag.color);
      });
    });

  // Version 24: CardSet 導入
  // - cardSets テーブル追加 (Folder -> CardSet -> Card 階層)
  // - cards に cardSetId インデックス追加
  // - 既存 Card を Folder 単位で CardSet へ自動移行 (冪等)
  db.version(24)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cardSets:
        "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
      cards:
        "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], [cardSetId+isDeleted], *tagIds",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      tags_v3:
        "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const genId = (): string => {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto)
          return crypto.randomUUID();
        return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      };

      const now = new Date();

      // 既存 CardSet を確認（idempotent: _migratedFromV24 フラグで二重実行防止）
      const existingSets: Record<string, unknown>[] = await tx.table("cardSets").toArray();
      const migratedFolderIds = new Set<string>(
        existingSets
          .filter((s) => s._migratedFromV24 === true)
          .map((s) => String(s.folderId ?? "__root__")),
      );

      type RawCard = {
        id: string;
        userId: string;
        folderId?: string;
        cardSetId?: string;
        [key: string]: unknown;
      };

      // cards を全件取得して folderId ごとにグループ化
      const allCards: RawCard[] = await tx.table("cards").toArray();
      const byFolder = new Map<string, RawCard[]>();
      for (const card of allCards) {
        if (card.cardSetId) continue; // 既に cardSetId がある場合はスキップ
        const key = card.folderId ?? "__root__";
        if (!byFolder.has(key)) byFolder.set(key, []);
        byFolder.get(key)!.push(card);
      }

      for (const [folderKey, folderCards] of byFolder.entries()) {
        if (migratedFolderIds.has(folderKey)) continue; // 既に移行済み

        const folderId = folderKey === "__root__" ? null : folderKey;

        let folderName = "インポート済みカード";
        if (folderId) {
          const folder = await tx.table("folders").get(folderId);
          if (folder?.folderName) {
            folderName = `${folder.folderName} セット`;
          }
        }

        const userId = folderCards[0]?.userId ?? "";
        const cardSetId = genId();

        await tx.table("cardSets").add({
          id: cardSetId,
          userId,
          folderId,
          name: folderName,
          orderIndex: 0,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
          _migratedFromV24: true,
        });

        const CHUNK = 100;
        for (let i = 0; i < folderCards.length; i += CHUNK) {
          const chunk = folderCards.slice(i, i + CHUNK);
          await Promise.all(
            chunk.map((c) =>
              tx.table("cards").update(c.id, {
                cardSetId,
                updatedAt: now,
              }),
            ),
          );
        }

        console.log(
          `[Migration v24] CardSet "${folderName}" (${cardSetId}) folderId=${folderId ?? "root"}, ${folderCards.length} cards moved.`,
        );
      }
    });

  // Version 25: CardSet 整合性を再修復
  // - cardSetId が欠損/不正/削除済みを参照する Card を救済
  // - Card と CardSet の folderId 不一致を補正
  // - 救済対象 Card は「フォルダごとに1つの移行セット」へ集約
  db.version(25)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cardSets:
        "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
      cards:
        "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], [cardSetId+isDeleted], *tagIds",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      tags_v3:
        "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const genId = (): string => {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto)
          return crypto.randomUUID();
        return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      };

      const toNormalizedFolderId = (value: unknown): string | null => {
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      const toCardFolderValue = (value: string | null): string => value ?? "";

      const MIGRATION_SET_NAME = "移行カードセット";

      type RawCard = {
        id: string;
        userId?: string;
        folderId?: string;
        cardSetId?: string;
        isDeleted?: boolean;
        is_deleted?: boolean;
      } & Record<string, unknown>;

      type RawCardSet = {
        id: string;
        userId?: string;
        folderId?: string | null;
        name?: string;
        orderIndex?: number;
        isDeleted?: boolean;
        is_deleted?: boolean;
      } & Record<string, unknown>;

      const now = new Date();
      const cardSetsTable = tx.table("cardSets");
      const cardsTable = tx.table("cards");

      const existingSets = (await cardSetsTable.toArray()) as RawCardSet[];
      const cardSetById = new Map(existingSets.map((set) => [set.id, set]));

      const maxOrderByFolder = new Map<string, number>();
      for (const set of existingSets) {
        if (set.isDeleted ?? set.is_deleted) continue;
        const key = toNormalizedFolderId(set.folderId) ?? "__root__";
        const order = Number.isFinite(set.orderIndex) ? Number(set.orderIndex) : 0;
        maxOrderByFolder.set(key, Math.max(maxOrderByFolder.get(key) ?? -1, order));
      }

      const allCards = (await cardsTable.toArray()) as RawCard[];

      let createdCardSetCount = 0;
      let rescuedCardCount = 0;
      let folderAlignedCardCount = 0;
      const rescueCardSetIdByFolder = new Map<string, string>();

      for (const card of allCards) {
        if (!card?.id) continue;
        if (card.isDeleted ?? card.is_deleted) continue;

        const cardFolderId = toNormalizedFolderId(card.folderId);
        const cardSetId = typeof card.cardSetId === "string" ? card.cardSetId.trim() : "";
        const targetSet = cardSetId ? cardSetById.get(cardSetId) : undefined;
        const setIsUsable = Boolean(targetSet && !(targetSet.isDeleted ?? targetSet.is_deleted));

        if (setIsUsable && targetSet) {
          const setFolderId = toNormalizedFolderId(targetSet.folderId);
          if (cardFolderId !== setFolderId) {
            await cardsTable.update(card.id, {
              folderId: toCardFolderValue(setFolderId),
              updatedAt: now,
            });
            folderAlignedCardCount += 1;
          }
          continue;
        }

        const folderKey = cardFolderId ?? "__root__";
        let rescueCardSetId = rescueCardSetIdByFolder.get(folderKey);
        if (!rescueCardSetId) {
          const nextOrder = (maxOrderByFolder.get(folderKey) ?? -1) + 1;
          maxOrderByFolder.set(folderKey, nextOrder);

          const newCardSetId = genId();
          const userId =
            typeof card.userId === "string" && card.userId.length > 0
              ? card.userId
              : "";

          await cardSetsTable.add({
            id: newCardSetId,
            userId,
            folderId: cardFolderId,
            name: MIGRATION_SET_NAME,
            orderIndex: nextOrder,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
            _migratedFromV25: true,
          });

          cardSetById.set(newCardSetId, {
            id: newCardSetId,
            userId,
            folderId: cardFolderId,
            name: MIGRATION_SET_NAME,
            orderIndex: nextOrder,
            isDeleted: false,
          });
          rescueCardSetIdByFolder.set(folderKey, newCardSetId);
          rescueCardSetId = newCardSetId;
          createdCardSetCount += 1;
        }

        await cardsTable.update(card.id, {
          cardSetId: rescueCardSetId,
          folderId: toCardFolderValue(cardFolderId),
          updatedAt: now,
        });

        rescuedCardCount += 1;
      }

      console.log(
        `[Migration v25] cardSetsCreated=${createdCardSetCount}, cardsRescued=${rescuedCardCount}, folderAligned=${folderAlignedCardCount}`,
      );
    });

  // Version 26: v25で分割された移行セットをフォルダ単位で統合
  // - _migratedFromV25=true の CardSet を対象
  // - 同一フォルダ内の複数移行セットを1つにまとめる
  db.version(26)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cardSets:
        "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
      cards:
        "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], [cardSetId+isDeleted], *tagIds",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      tags_v3:
        "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const toNormalizedFolderId = (value: unknown): string | null => {
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      };
      const normalizeFallbackTitleFromSetName = (
        rawName: unknown,
      ): string | null => {
        if (typeof rawName !== "string") return null;
        const name = rawName.trim();
        if (!name) return null;
        if (name === "移行カードセット" || name === "新規カードセット") return null;
        const stripped = name.replace(/\s*セット$/, "").trim();
        if (!stripped) return null;
        if (stripped === "移行カード" || stripped === "新規カード") return null;
        return stripped;
      };
      const normalizeCardTitle = (rawTitle: unknown): string => {
        if (typeof rawTitle !== "string") return "";
        return rawTitle.trim();
      };

      type RawCardSet = {
        id: string;
        folderId?: string | null;
        orderIndex?: number;
        isDeleted?: boolean;
        is_deleted?: boolean;
        _migratedFromV25?: boolean;
      } & Record<string, unknown>;

      type RawCard = {
        id: string;
        cardSetId?: string;
        orderIndex?: number;
        isDeleted?: boolean;
        is_deleted?: boolean;
      } & Record<string, unknown>;

      const now = new Date();
      const cardSetsTable = tx.table("cardSets");
      const cardsTable = tx.table("cards");

      const allSets = (await cardSetsTable.toArray()) as RawCardSet[];
      const activeSets = allSets.filter((set) => !(set.isDeleted ?? set.is_deleted));
      const allCards = (await cardsTable.toArray()) as RawCard[];
      const activeCards = allCards.filter((card) => !(card.isDeleted ?? card.is_deleted));

      const cardsBySetId = new Map<string, RawCard[]>();
      for (const card of activeCards) {
        const csId = typeof card.cardSetId === "string" ? card.cardSetId : "";
        if (!csId) continue;
        const list = cardsBySetId.get(csId);
        if (list) list.push(card);
        else cardsBySetId.set(csId, [card]);
      }

      const migratedSetsByFolder = new Map<string, RawCardSet[]>();
      for (const set of activeSets) {
        if (set._migratedFromV25 !== true) continue;
        const folderKey = toNormalizedFolderId(set.folderId) ?? "__root__";
        const list = migratedSetsByFolder.get(folderKey);
        if (list) list.push(set);
        else migratedSetsByFolder.set(folderKey, [set]);
      }

      let mergedSetCount = 0;
      let movedCardCount = 0;

      for (const [folderKey, migratedSets] of migratedSetsByFolder.entries()) {
        if (migratedSets.length <= 1) continue;

        const sameFolderNonMigrated = activeSets.filter((set) => {
          if (set._migratedFromV25 === true) return false;
          const key = toNormalizedFolderId(set.folderId) ?? "__root__";
          return key === folderKey;
        });

        const targetSet: RawCardSet =
          sameFolderNonMigrated.length === 1
            ? sameFolderNonMigrated[0]
            : [...migratedSets].sort((a, b) => {
                const orderA = Number.isFinite(a.orderIndex) ? Number(a.orderIndex) : 0;
                const orderB = Number.isFinite(b.orderIndex) ? Number(b.orderIndex) : 0;
                return orderA - orderB;
              })[0];

        const targetId = targetSet.id;
        const sourceSets = migratedSets.filter((set) => set.id !== targetId);

        const targetCards = cardsBySetId.get(targetId) ?? [];
        const usedOrderIndex = new Set<number>();
        let maxOrder =
          targetCards.reduce(
            (max, card) =>
              Math.max(max, Number.isFinite(card.orderIndex) ? Number(card.orderIndex) : -1),
            -1,
          ) ?? -1;
        for (const card of targetCards) {
          if (!Number.isFinite(card.orderIndex)) continue;
          usedOrderIndex.add(Number(card.orderIndex));
        }

        const allocateOrderIndex = (desired: number | null): number => {
          if (desired != null && !usedOrderIndex.has(desired)) {
            usedOrderIndex.add(desired);
            if (desired > maxOrder) maxOrder = desired;
            return desired;
          }
          let candidate = maxOrder + 1;
          while (usedOrderIndex.has(candidate)) candidate += 1;
          usedOrderIndex.add(candidate);
          maxOrder = candidate;
          return candidate;
        };

        for (const source of sourceSets) {
          const fallbackTitle = normalizeFallbackTitleFromSetName(source.name);
          const sourceCards = [...(cardsBySetId.get(source.id) ?? [])].sort(
            (a, b) =>
              (Number.isFinite(a.orderIndex) ? Number(a.orderIndex) : 0) -
              (Number.isFinite(b.orderIndex) ? Number(b.orderIndex) : 0),
          );

          for (const card of sourceCards) {
            const currentTitle = normalizeCardTitle(card.title);
            const desiredOrder = Number.isFinite(card.orderIndex)
              ? Number(card.orderIndex)
              : null;
            const nextOrder = allocateOrderIndex(desiredOrder);
            await cardsTable.update(card.id, {
              cardSetId: targetId,
              orderIndex: nextOrder,
              ...(currentTitle.length === 0 && fallbackTitle
                ? { title: fallbackTitle }
                : {}),
              updatedAt: now,
            });
            movedCardCount += 1;
          }

          await cardSetsTable.update(source.id, {
            isDeleted: true,
            updatedAt: now,
          });
          mergedSetCount += 1;
        }
      }

      console.log(
        `[Migration v26] mergedSets=${mergedSetCount}, movedCards=${movedCardCount}`,
      );
    });

  // Version 27: 既存統合データの補正
  // - v26 実行済み環境向けに、空タイトルを旧移行セット名から補完
  // - questionNumber が十分ある場合は順序を再構成
  db.version(27)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cardSets:
        "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
      cards:
        "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], [cardSetId+isDeleted], *tagIds",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      tags_v3:
        "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const toNormalizedFolderId = (value: unknown): string | null => {
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      };
      const normalizeFallbackTitleFromSetName = (
        rawName: unknown,
      ): string | null => {
        if (typeof rawName !== "string") return null;
        const name = rawName.trim();
        if (!name) return null;
        if (name === "移行カードセット" || name === "新規カードセット") return null;
        const stripped = name.replace(/\s*セット$/, "").trim();
        if (!stripped) return null;
        if (stripped === "移行カード" || stripped === "新規カード") return null;
        return stripped;
      };
      const parseQuestionOrder = (questionNumber: unknown): number | null => {
        if (typeof questionNumber !== "string") return null;
        const trimmed = questionNumber.trim();
        if (!trimmed) return null;
        const match = trimmed.match(/^Q?\s*(\d+)$/i);
        if (!match) return null;
        const parsed = Number(match[1]);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const getOrderValue = (value: unknown): number =>
        Number.isFinite(value) ? Number(value) : Number.MAX_SAFE_INTEGER;
      const getTitleValue = (value: unknown): string =>
        typeof value === "string" ? value.trim() : "";

      type RawCardSet = {
        id: string;
        folderId?: string | null;
        orderIndex?: number;
        name?: string;
        isDeleted?: boolean;
        is_deleted?: boolean;
        _migratedFromV25?: boolean;
      } & Record<string, unknown>;

      type RawCard = {
        id: string;
        cardSetId?: string;
        orderIndex?: number;
        title?: string;
        questionNumber?: string;
        isDeleted?: boolean;
        is_deleted?: boolean;
      } & Record<string, unknown>;

      const now = new Date();
      const cardSetsTable = tx.table("cardSets");
      const cardsTable = tx.table("cards");

      const allSets = (await cardSetsTable.toArray()) as RawCardSet[];
      const allCards = (await cardsTable.toArray()) as RawCard[];
      const activeSets = allSets.filter((set) => !(set.isDeleted ?? set.is_deleted));
      const activeCards = allCards.filter((card) => !(card.isDeleted ?? card.is_deleted));

      const activeSetsByFolder = new Map<string, RawCardSet[]>();
      const migratedSetsByFolder = new Map<string, RawCardSet[]>();
      for (const set of allSets) {
        const key = toNormalizedFolderId(set.folderId) ?? "__root__";
        if (!(set.isDeleted ?? set.is_deleted)) {
          const list = activeSetsByFolder.get(key);
          if (list) list.push(set);
          else activeSetsByFolder.set(key, [set]);
        }
        if (set._migratedFromV25 === true) {
          const list = migratedSetsByFolder.get(key);
          if (list) list.push(set);
          else migratedSetsByFolder.set(key, [set]);
        }
      }

      const cardsBySetId = new Map<string, RawCard[]>();
      for (const card of activeCards) {
        const setId = typeof card.cardSetId === "string" ? card.cardSetId : "";
        if (!setId) continue;
        const list = cardsBySetId.get(setId);
        if (list) list.push(card);
        else cardsBySetId.set(setId, [card]);
      }

      let patchedTitles = 0;
      let patchedOrders = 0;

      for (const [folderKey, migratedSets] of migratedSetsByFolder.entries()) {
        const folderActiveSets = activeSetsByFolder.get(folderKey) ?? [];
        if (folderActiveSets.length === 0) continue;

        const activeNonMigrated = folderActiveSets.filter(
          (set) => set._migratedFromV25 !== true,
        );
        const sortedByOrder = [...folderActiveSets].sort(
          (a, b) => getOrderValue(a.orderIndex) - getOrderValue(b.orderIndex),
        );
        const targetSet =
          activeNonMigrated.length === 1
            ? activeNonMigrated[0]
            : activeNonMigrated.length > 1
              ? [...activeNonMigrated].sort(
                  (a, b) => getOrderValue(a.orderIndex) - getOrderValue(b.orderIndex),
                )[0]
              : sortedByOrder[0];

        if (!targetSet?.id) continue;

        const targetCards = [...(cardsBySetId.get(targetSet.id) ?? [])].sort(
          (a, b) => getOrderValue(a.orderIndex) - getOrderValue(b.orderIndex),
        );
        if (targetCards.length === 0) continue;

        const nameCandidates = [...migratedSets]
          .sort((a, b) => getOrderValue(a.orderIndex) - getOrderValue(b.orderIndex))
          .map((set) => normalizeFallbackTitleFromSetName(set.name))
          .filter((name): name is string => Boolean(name));

        if (nameCandidates.length > 0) {
          const emptyTitleCards = targetCards.filter(
            (card) => getTitleValue(card.title).length === 0,
          );
          const usedTitles = new Set(
            targetCards.map((card) => getTitleValue(card.title)).filter(Boolean),
          );
          let cursor = 0;
          for (const card of emptyTitleCards) {
            while (cursor < nameCandidates.length && usedTitles.has(nameCandidates[cursor])) {
              cursor += 1;
            }
            if (cursor >= nameCandidates.length) break;
            const nextTitle = nameCandidates[cursor];
            cursor += 1;
            usedTitles.add(nextTitle);
            await cardsTable.update(card.id, { title: nextTitle, updatedAt: now });
            patchedTitles += 1;
          }
        }

        const withQuestionOrder = targetCards
          .map((card) => ({
            card,
            qn: parseQuestionOrder(card.questionNumber),
            currentOrder: getOrderValue(card.orderIndex),
          }))
          .filter((entry) => entry.qn != null);

        const hasEnoughSignal =
          withQuestionOrder.length >= 2 &&
          withQuestionOrder.length >= Math.ceil(targetCards.length * 0.6);
        if (!hasEnoughSignal) continue;

        const expectedOrder = [...targetCards].sort((a, b) => {
          const aQ = parseQuestionOrder(a.questionNumber);
          const bQ = parseQuestionOrder(b.questionNumber);
          if (aQ != null && bQ != null && aQ !== bQ) return aQ - bQ;
          if (aQ != null && bQ == null) return -1;
          if (aQ == null && bQ != null) return 1;
          return getOrderValue(a.orderIndex) - getOrderValue(b.orderIndex);
        });

        for (let i = 0; i < expectedOrder.length; i += 1) {
          const card = expectedOrder[i];
          if (getOrderValue(card.orderIndex) === i) continue;
          await cardsTable.update(card.id, { orderIndex: i, updatedAt: now });
          patchedOrders += 1;
        }
      }

      console.log(
        `[Migration v27] patchedTitles=${patchedTitles}, patchedOrders=${patchedOrders}`,
      );
    });

  // Version 28: 移行由来タイトルの除去と順序再補正
  // - "移行カードセット N" をカードタイトルから取り除く
  // - 順序は既存の orderIndex を尊重しつつ、数値ヒントが十分ある場合のみ再採番
  db.version(28)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cardSets:
        "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
      cards:
        "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], [cardSetId+isDeleted], *tagIds",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      tags_v3:
        "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      const now = new Date();
      const MIGRATION_TITLE_RE = /^\s*移行カードセット\s*(\d+)\s*$/;
      const NUMERIC_TITLE_RE = /^\s*(\d+)\s*$/;
      const Q_NUMBER_RE = /^Q?\s*(\d+)$/i;

      const toNumberOrNull = (value: unknown): number | null =>
        Number.isFinite(value) ? Number(value) : null;

      const parseHintOrder = (card: Record<string, unknown>): number | null => {
        const title = typeof card.title === "string" ? card.title.trim() : "";
        const qn =
          typeof card.questionNumber === "string"
            ? card.questionNumber.trim()
            : "";

        const m1 = title.match(MIGRATION_TITLE_RE);
        if (m1) return Number(m1[1]);

        const m2 = qn.match(Q_NUMBER_RE);
        if (m2) return Number(m2[1]);

        const m3 = title.match(NUMERIC_TITLE_RE);
        if (m3) return Number(m3[1]);

        return null;
      };

      type RawCard = {
        id: string;
        cardSetId?: string;
        orderIndex?: number;
        title?: string;
        questionNumber?: string;
        isDeleted?: boolean;
        is_deleted?: boolean;
      } & Record<string, unknown>;

      const cardsTable = tx.table("cards");
      const allCards = (await cardsTable.toArray()) as RawCard[];
      const activeCards = allCards.filter((c) => !(c.isDeleted ?? c.is_deleted));

      // 1) 移行由来タイトルを除去
      let clearedMigrationTitles = 0;
      for (const card of activeCards) {
        const title = typeof card.title === "string" ? card.title.trim() : "";
        if (!MIGRATION_TITLE_RE.test(title)) continue;
        await cardsTable.update(card.id, { title: "", updatedAt: now });
        clearedMigrationTitles += 1;
      }

      // 2) カードセットごとに順序再補正（ヒントが十分あるときのみ）
      const cardsBySetId = new Map<string, RawCard[]>();
      for (const card of activeCards) {
        const setId = typeof card.cardSetId === "string" ? card.cardSetId : "";
        if (!setId) continue;
        const list = cardsBySetId.get(setId);
        if (list) list.push(card);
        else cardsBySetId.set(setId, [card]);
      }

      let reorderedCards = 0;
      for (const cards of cardsBySetId.values()) {
        if (cards.length <= 1) continue;

        const withHints = cards
          .map((card, idx) => ({
            card,
            idx,
            hint: parseHintOrder(card),
            currentOrder: toNumberOrNull(card.orderIndex) ?? Number.MAX_SAFE_INTEGER,
          }))
          .filter((x) => x.hint != null);

        const enoughHints =
          withHints.length >= 2 &&
          withHints.length >= Math.ceil(cards.length * 0.6);
        if (!enoughHints) continue;

        const sorted = [...cards].sort((a, b) => {
          const ah = parseHintOrder(a);
          const bh = parseHintOrder(b);
          if (ah != null && bh != null && ah !== bh) return ah - bh;
          if (ah != null && bh == null) return -1;
          if (ah == null && bh != null) return 1;
          const ao = toNumberOrNull(a.orderIndex) ?? Number.MAX_SAFE_INTEGER;
          const bo = toNumberOrNull(b.orderIndex) ?? Number.MAX_SAFE_INTEGER;
          return ao - bo;
        });

        for (let i = 0; i < sorted.length; i += 1) {
          const card = sorted[i];
          const current = toNumberOrNull(card.orderIndex);
          if (current === i) continue;
          await cardsTable.update(card.id, { orderIndex: i, updatedAt: now });
          reorderedCards += 1;
        }
      }

      console.log(
        `[Migration v28] clearedMigrationTitles=${clearedMigrationTitles}, reorderedCards=${reorderedCards}`,
      );
    });

  // Version 29: card content schema migration
  // - question*/answer* flat fields を front/back に統合
  // - legacy ブロック/インク/extraRows を face 配下へ移す
  db.version(29)
    .stores({
      folders:
        "id, userId, parentFolderId, updatedAt, cloudSyncEnabled, isDeleted, [userId+updatedAt], [userId+isDeleted]",
      cardSets:
        "id, userId, folderId, updatedAt, isDeleted, [userId+updatedAt], [userId+folderId]",
      cards:
        "id, userId, folderId, cardSetId, updatedAt, nextReviewDate, isDeleted, difficulty, reviewCount, [userId+updatedAt], [userId+isDeleted], [userId+nextReviewDate], [cardSetId+isDeleted], *tagIds",
      documents:
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
      tags: "[rootFolderId+name], rootFolderId, userId, updatedAt",
      tags_v2: "[userId+name], userId, updatedAt",
      tags_v3:
        "id, userId, parentId, [userId+parentId], [userId+nameLower], updatedAt",
      studyLogs: "id, userId, cardId, studiedAt",
      metadata: "key",
      images: "id, userId, status, [userId+status]",
      cardRelations:
        "id, userId, fromCardId, toCardId, updatedAt, [userId+updatedAt]",
      projectMaps: "id, userId, folderId, updatedAt, [userId+updatedAt]",
    })
    .upgrade(async (tx) => {
      type RawCardRow = Record<string, unknown> & { id: string };
      const cardsTable = tx.table("cards");

      const sanitizeImages = (images: unknown) =>
        Array.isArray(images)
          ? images.map((image) => {
              if (!image || typeof image !== "object") return image;
              const record = image as Record<string, unknown>;
              const assetId = record.assetId ?? record.id ?? null;
              const remoteUrl =
                typeof record.remoteUrl === "string" &&
                record.remoteUrl.startsWith("http")
                  ? record.remoteUrl
                  : null;
              return {
                id: record.id ?? assetId,
                assetId,
                localFileId: record.localFileId ?? assetId,
                remoteUrl,
                storagePath: record.storagePath ?? null,
                status: record.status ?? (remoteUrl ? "ready" : "uploading"),
                error: record.error ?? undefined,
                scale: record.scale ?? 1,
                x: record.x ?? 0,
                naturalW: record.naturalW ?? null,
                naturalH: record.naturalH ?? null,
              };
            })
          : [];

      const normalizeBlocks = (blocks: unknown) => {
        if (!Array.isArray(blocks)) return [];
        return blocks.map((block) => {
          if (!block || typeof block !== "object") return block;
          const record = block as Record<string, unknown>;
          if (!Array.isArray(record.images)) return block;
          return {
            ...record,
            images: sanitizeImages(record.images),
          };
        });
      };

      const normalizeExtraRows = (value: unknown) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
      };

      const buildFallbackBlocks = (
        side: "question" | "answer",
        row: RawCardRow,
      ) => {
        const textKey = side === "question" ? "questionText" : "answerText";
        const imagesKey =
          side === "question" ? "questionImages" : "answerImages";
        const audiosKey =
          side === "question" ? "questionAudios" : "answerAudios";
        const codeKey = side === "question" ? "questionCode" : "answerCode";
        const text = typeof row[textKey] === "string" ? row[textKey].trim() : "";
        const images = sanitizeImages(row[imagesKey]);
        const audios = Array.isArray(row[audiosKey]) ? row[audiosKey] : [];
        const code = row[codeKey];
        const blocks: Record<string, unknown>[] = [];
        let orderIndex = 0;

        if (text) {
          blocks.push({
            id: `${side}-text-${row.id}`,
            type: "text",
            content: text,
            orderIndex: orderIndex++,
          });
        }
        if (code) {
          blocks.push({
            id: `${side}-code-${row.id}`,
            type: "code",
            code,
            orderIndex: orderIndex++,
          });
        }
        if (images.length > 0) {
          blocks.push({
            id: `${side}-image-${row.id}`,
            type: "image",
            images,
            orderIndex: orderIndex++,
          });
        }
        if (audios.length > 0) {
          blocks.push({
            id: `${side}-audio-${row.id}`,
            type: "audio",
            audios,
            orderIndex: orderIndex++,
          });
        }
        return blocks;
      };

      await cardsTable.toCollection().modify((card: RawCardRow) => {
        const existingFront =
          card.front && typeof card.front === "object"
            ? (card.front as Record<string, unknown>)
            : {};
        const existingBack =
          card.back && typeof card.back === "object"
            ? (card.back as Record<string, unknown>)
            : {};

        const frontBlocks = normalizeBlocks(
          existingFront.blocks ?? card.questionBlocks ?? card.question_blocks,
        );
        const backBlocks = normalizeBlocks(
          existingBack.blocks ?? card.answerBlocks ?? card.answer_blocks,
        );

        card.front = {
          ...existingFront,
          blocks:
            frontBlocks.length > 0
              ? frontBlocks
              : buildFallbackBlocks("question", card),
          ink: existingFront.ink ?? card.inkQuestion ?? card.ink_question ?? null,
          extraRows: normalizeExtraRows(
            existingFront.extraRows ??
              card.questionExtraRows ??
              card.question_extra_rows,
          ),
        };

        card.back = {
          ...existingBack,
          blocks:
            backBlocks.length > 0 ? backBlocks : buildFallbackBlocks("answer", card),
          ink: existingBack.ink ?? card.inkAnswer ?? card.ink_answer ?? null,
          extraRows: normalizeExtraRows(
            existingBack.extraRows ??
              card.answerExtraRows ??
              card.answer_extra_rows,
          ),
        };

        delete card.questionBlocks;
        delete card.answerBlocks;
        delete card.question_blocks;
        delete card.answer_blocks;
        delete card.questionText;
        delete card.answerText;
        delete card.question_text;
        delete card.answer_text;
        delete card.questionImages;
        delete card.answerImages;
        delete card.question_images;
        delete card.answer_images;
        delete card.questionAudios;
        delete card.answerAudios;
        delete card.question_audios;
        delete card.answer_audios;
        delete card.questionCode;
        delete card.answerCode;
        delete card.question_code;
        delete card.answer_code;
        delete card.questionMarked;
        delete card.answerMarked;
        delete card.question_marked;
        delete card.answer_marked;
        delete card.questionTextHighlighted;
        delete card.answerTextHighlighted;
        delete card.frontBlocks;
        delete card.backBlocks;
        delete card.inkQuestion;
        delete card.inkAnswer;
        delete card.ink_question;
        delete card.ink_answer;
        delete card.questionExtraRows;
        delete card.answerExtraRows;
        delete card.question_extra_rows;
        delete card.answer_extra_rows;
      });
    });
};

