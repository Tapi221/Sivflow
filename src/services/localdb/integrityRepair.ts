import type {
  IntegrityIssue,
} from "@/services/dataIntegrityTypes";
import {
  denormalizeUploadedImages,
  normalizeUploadedImages,
} from "@/utils/uploaded-image/normalizer";
import type { LocalDB } from "./LocalDB";

type Side = "question" | "answer";
type UnknownRecord = Record<string, unknown>;

type UploadedImageStatus = "ready" | "failed" | "uploading";

type UploadedImage = {
  id: string;
  assetId?: string;
  localFileId?: string;
  localUrl?: string; // nullは禁止（optional string）
  remoteUrl?: string;
  status: UploadedImageStatus;
  contentType?: string;
  size?: number;
  storagePath?: string;
  error?: unknown;
  [key: string]: unknown;
};

const isRecord = (v: unknown): v is UnknownRecord =>
  typeof v === "object" && v !== null;

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const toStringOrNull = (v: unknown): string | null =>
  isNonEmptyString(v) ? v : null;

const notNull = <T>(v: T | null): v is T => v !== null;

const createUuid = (): string => {
  const c = globalThis.crypto;

  if (c && "randomUUID" in c && typeof c.randomUUID === "function")
    return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && "getRandomValues" in c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1)
      bytes[i] = Math.floor(Math.random() * 256);
  }

  // RFC4122 v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const normalizeImageStatus = (v: unknown): UploadedImageStatus => {
  if (v === "ready" || v === "failed" || v === "uploading") return v;
  return "ready";
};

const toUploadedImage = (img: UnknownRecord): UploadedImage => {
  const id = toStringOrNull(img.id) ?? createUuid();
  const status = normalizeImageStatus(img.status);
  return { ...img, id, status };
};

const pickString = (obj: UnknownRecord, keys: string[]): string | null => {
  for (const k of keys) {
    const v = obj[k];
    if (isNonEmptyString(v)) return v;
  }
  return null;
};

export const repairDataIntegrity = (
  db: LocalDB,
  currentUserId: string,
  onProgress?: (msg: string) => void,
) => {
  const issues: IntegrityIssue[] = [];

  const normalizedTimestamp = (value: unknown): Date | null => {
    if (value == null || value === "") return null;

    if (value instanceof Date)
      return Number.isNaN(value.getTime()) ? null : value;

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (isRecord(value) && typeof value.toDate === "function") {
      try {
        const dt = (value.toDate as () => unknown)();
        return dt instanceof Date && !Number.isNaN(dt.getTime()) ? dt : null;
      } catch {
        return null;
      }
    }

    return null;
  };

  const extractSideText = (
    blocks: UnknownRecord[],
    side: Side,
  ): string | null => {
    const found = blocks.find((block) => {
      const role = String(block.side ?? block.role ?? "").toLowerCase();
      const type = String(block.type ?? "").toLowerCase();
      return role === side || type === side || type === `${side}_text`;
    });

    if (!found) return null;

    const text = found.text;
    return isNonEmptyString(text) ? text.trim() : null;
  };

  const pushBlobRepairIssue = (
    entityId: string,
    side: Side,
    details: Record<string, unknown>,
  ) => {
    issues.push({
      code: "MISSING_REQUIRED_FIELD",
      entityType: "card",
      entityId,
      severity: "warning",
      fixed: true,
      details: { side, ...details },
    });
  };

  const getAnyBlocks = (
    cardRecord: UnknownRecord,
    side: Side,
  ): UnknownRecord[] => {
    const raw =
      side === "question"
        ? (cardRecord.questionBlocks ?? cardRecord.question_blocks)
        : (cardRecord.answerBlocks ?? cardRecord.answer_blocks);

    if (!Array.isArray(raw)) return [];
    return raw.filter(isRecord);
  };

  const resolveImageUrls = (img: unknown) => {
    const rec = isRecord(img) ? img : {};
    const localUrl = pickString(rec, ["localUrl", "local_url"]);
    const remoteUrl = pickString(rec, ["remoteUrl", "remote_url", "url"]);
    return { localUrl, remoteUrl };
  };

  const makeMissingLocalImage = (
    img: unknown,
    remoteUrl: string | null,
  ): UnknownRecord => {
    const rec = isRecord(img) ? img : {};
    const hasRemote = isNonEmptyString(remoteUrl);

    const status = rec.status;
    const error = rec.error;

    return {
      ...rec,
      localUrl: null,
      local_url: null,
      status: hasRemote
        ? isNonEmptyString(status)
          ? status
          : "ready"
        : "failed",
      error: hasRemote
        ? error
        : "画像が端末内に存在しません。再添付してください。",
    };
  };

  const repairBlockImages = (
    blocks: UnknownRecord[],
    entityId: string,
    side: Side,
  ) => {
    if (blocks.length === 0) return { blocks, changed: false };

    let changed = false;

    const repairedBlocks: UnknownRecord[] = blocks.map((block) => {
      let nextBlock: UnknownRecord = { ...block };
      let blockChanged = false;

      const imagesRaw = nextBlock.images;
      if (Array.isArray(imagesRaw)) {
        const repairedImages = imagesRaw.map((img) => {
          if (!isRecord(img)) return img;

          const { localUrl, remoteUrl } = resolveImageUrls(img);
          if (!localUrl || !localUrl.startsWith("blob:")) return img;

          blockChanged = true;
          pushBlobRepairIssue(entityId, side, {
            blockId: toStringOrNull(nextBlock.id),
            imageId: toStringOrNull(img.id),
            reason: "removed_persisted_blob_url",
          });

          return makeMissingLocalImage(img, remoteUrl);
        });

        if (blockChanged) nextBlock = { ...nextBlock, images: repairedImages };
      }

      const blockStringFields = [
        "src",
        "url",
        "localUrl",
        "local_url",
      ] as const;
      for (const key of blockStringFields) {
        const value = nextBlock[key];
        if (!isNonEmptyString(value) || !value.startsWith("blob:")) continue;

        blockChanged = true;
        pushBlobRepairIssue(entityId, side, {
          blockId: toStringOrNull(nextBlock.id),
          reason: "removed_persisted_blob_url_block_field",
          field: key,
        });

        nextBlock = {
          ...nextBlock,
          [key]: null,
          status: "failed",
          error: "画像が端末内に存在しません。再添付してください。",
        };
      }

      if (!blockChanged) return block;
      changed = true;
      return nextBlock;
    });

    return { blocks: repairedBlocks, changed };
  };

  const repairLegacyImages = (
    imagesRaw: unknown,
    entityId: string,
    side: Side,
  ) => {
    const normalized = normalizeUploadedImages(imagesRaw ?? []) as unknown[];

    const normalizedImages: UploadedImage[] = normalized
      .filter(isRecord)
      .map(toUploadedImage);

    if (normalizedImages.length === 0)
      return { cleaned: normalizedImages, changed: false };

    let changed = false;

    const cleaned: UploadedImage[] = normalizedImages.map((img) => {
      const localUrl =
        typeof img.localUrl === "string" ? img.localUrl : undefined;
      if (!localUrl || !localUrl.startsWith("blob:")) return img;

      changed = true;
      pushBlobRepairIssue(entityId, side, {
        imageId: img.id ?? null,
        reason: "removed_persisted_blob_url_legacy_array",
      });

      const hasRemote =
        typeof img.remoteUrl === "string" && img.remoteUrl.trim().length > 0;

      return {
        ...img,
        localUrl: undefined, // null禁止（TS2345回避）
        status: hasRemote ? img.status : "failed",
        error: hasRemote
          ? img.error
          : "画像が端末内に存在しません。再添付してください。",
      };
    });

    return { cleaned, changed };
  };

  onProgress?.("整合性修復を開始...");

  const allFolders = (await db.folders.toArray()) as unknown[];
  const allCards = (await db.cards.toArray()) as unknown[];
  const rescueFolderId = "RESCUE_ORPHANS_FOLDER";

  let foldersUpdated = 0;
  let cardsUpdated = 0;

  const folderIds = new Set(
    allFolders
      .filter(isRecord)
      .map((f) => String(f.id ?? f.folderId ?? ""))
      .filter((s) => s.trim().length > 0),
  );

  const folderUpdates = allFolders
    .filter(isRecord)
    .map((folder) => {
      const update: UnknownRecord = { ...folder };
      let changed = false;

      const id = toStringOrNull(update.id);
      const folderId = toStringOrNull(update.folderId);

      if (!id) {
        update.id = folderId ?? createUuid();
        changed = true;
      }
      if (!folderId) {
        update.folderId = toStringOrNull(update.id) ?? createUuid();
        changed = true;
      }

      const userId = toStringOrNull(update.userId);
      if (!userId) {
        update.userId = currentUserId;
        changed = true;
      }

      if (update.parentFolderId === undefined) {
        update.parentFolderId = null;
        changed = true;
      }

      const name =
        toStringOrNull(update.folderName) ??
        toStringOrNull(update.name) ??
        toStringOrNull(update.folder_name);

      if (!name) {
        update.folderName = "Recovered Folder";
        changed = true;
      } else if (!toStringOrNull(update.folderName)) {
        update.folderName = name;
        changed = true;
      }

      if (changed) {
        foldersUpdated += 1;
        return update;
      }
      return null;
    })
    .filter(notNull);

  if (folderUpdates.length > 0) {
    await db.folders.bulkPut(
      folderUpdates as unknown as Parameters<typeof db.folders.bulkPut>[0],
    );
  }

  if (!folderIds.has(rescueFolderId)) {
    await db.folders.put({
      id: rescueFolderId,
      folderId: rescueFolderId,
      folderName: "Recovered Folder",
      userId: currentUserId,
      parentFolderId: null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Parameters<typeof db.folders.put>[0]);

    folderIds.add(rescueFolderId);
    foldersUpdated += 1;
  }

  onProgress?.("カード不整合を修復中...");

  const cardUpdates = allCards
    .filter(isRecord)
    .map((card) => {
      const update: UnknownRecord = { ...card };
      const entityId = String(update.id ?? update.cardId ?? "unknown");
      let changed = false;

      const id = toStringOrNull(update.id);
      const cardId =
        toStringOrNull(update.cardId) ?? toStringOrNull(update.card_id);

      if (!id) {
        update.id = cardId ?? createUuid();
        changed = true;
      }

      const userId = toStringOrNull(update.userId);
      if (userId !== currentUserId) {
        update.userId = currentUserId;
        changed = true;
      }

      const hasDeletedAt = update.deletedAt != null;

      // no-extra-boolean-cast 対策: Boolean(), !! を使わずに boolean に落とす
      const isDeleted =
        (update.isDeleted ? true : false) ||
        (update.is_deleted ? true : false) ||
        (update.deleted ? true : false);

      if (hasDeletedAt !== isDeleted) {
        update.isDeleted = hasDeletedAt;
        changed = true;
        issues.push({
          code: "DELETED_FLAG_MISMATCH",
          entityType: "card",
          entityId,
          severity: "warning",
          fixed: true,
          details: {
            hasDeletedAt,
            isDeletedBefore: isDeleted,
            isDeletedAfter: hasDeletedAt,
          },
        });
      }

      if (update.is_deleted !== undefined) {
        Reflect.deleteProperty(update, "is_deleted");
        changed = true;
      }
      if (update.deleted !== undefined) {
        Reflect.deleteProperty(update, "deleted");
        changed = true;
      }

      const timestampFields = [
        "createdAt",
        "updatedAt",
        "deletedAt",
        "nextReviewDate",
        "lastReviewAt",
      ] as const;

      for (const key of timestampFields) {
        const raw = update[key];
        if (raw == null) continue;

        const normalized = normalizedTimestamp(raw);
        if (!normalized) continue;

        if (!(raw instanceof Date)) {
          update[key] = normalized;
          changed = true;
          issues.push({
            code: "TIMESTAMP_TYPE_MIXED",
            entityType: "card",
            entityId,
            severity: "info",
            fixed: true,
            details: { field: key, originalType: typeof raw },
          });
        }
      }

      const folderIdNow = toStringOrNull(update.folderId);
      const missingFolder = folderIdNow == null || folderIdNow.trim() === "";

      if (!isDeleted && missingFolder) {
        update.folderId = rescueFolderId;
        changed = true;
        issues.push({
          code: "MISSING_FOLDER",
          entityType: "card",
          entityId,
          severity: "error",
          fixed: true,
          details: { assignedFolderId: rescueFolderId },
        });
      }

      const blocksRaw = update.blocks;
      const blocks: UnknownRecord[] = Array.isArray(blocksRaw)
        ? blocksRaw.filter(isRecord).map((b) => ({ ...b }))
        : [];

      if (blocks.length > 0) {
        let blockChanged = false;

        blocks.forEach((block, index) => {
          if (typeof block.orderIndex !== "number") {
            block.orderIndex = index;
            blockChanged = true;
          }
        });

        if (blockChanged) {
          update.blocks = blocks;
          changed = true;
          issues.push({
            code: "BLOCK_ORDER_INDEX_MISSING",
            entityType: "card",
            entityId,
            severity: "warning",
            fixed: true,
            details: { blockCount: blocks.length },
          });
        }

        const qBlockText = extractSideText(blocks, "question");
        const aBlockText = extractSideText(blocks, "answer");

        const qText = isNonEmptyString(update.questionText)
          ? update.questionText.trim()
          : "";
        const aText = isNonEmptyString(update.answerText)
          ? update.answerText.trim()
          : "";

        const hasQMismatch =
          qBlockText !== null && qText !== "" && qBlockText !== qText;
        const hasAMismatch =
          aBlockText !== null && aText !== "" && aBlockText !== aText;

        if (hasQMismatch || hasAMismatch) {
          if (qBlockText) update.questionText = qBlockText;
          if (aBlockText) update.answerText = aBlockText;

          changed = true;
          issues.push({
            code: "TEXT_BLOCK_MISMATCH",
            entityType: "card",
            entityId,
            severity: "warning",
            fixed: true,
            details: {
              hasQuestionMismatch: hasQMismatch,
              hasAnswerMismatch: hasAMismatch,
            },
          });
        }
      }

      const questionBlocksRaw = getAnyBlocks(update, "question");
      const answerBlocksRaw = getAnyBlocks(update, "answer");

      const questionBlockRepair = repairBlockImages(
        questionBlocksRaw,
        entityId,
        "question",
      );
      if (questionBlockRepair.changed) {
        update.questionBlocks = questionBlockRepair.blocks;
        if (update.question_blocks !== undefined)
          Reflect.deleteProperty(update, "question_blocks");
        changed = true;
      }

      const answerBlockRepair = repairBlockImages(
        answerBlocksRaw,
        entityId,
        "answer",
      );
      if (answerBlockRepair.changed) {
        update.answerBlocks = answerBlockRepair.blocks;
        if (update.answer_blocks !== undefined)
          Reflect.deleteProperty(update, "answer_blocks");
        changed = true;
      }

      if (
        update.questionImages !== undefined ||
        update.question_images !== undefined
      ) {
        const repairedQuestionImages = repairLegacyImages(
          update.questionImages ?? update.question_images,
          entityId,
          "question",
        );

        if (repairedQuestionImages.changed) {
          update.questionImages = denormalizeUploadedImages(
            repairedQuestionImages.cleaned,
            {
              case: "camel",
              stripUndefined: true,
            },
          ) as unknown;

          if (update.question_images !== undefined)
            Reflect.deleteProperty(update, "question_images");
          changed = true;
        }
      }

      if (
        update.answerImages !== undefined ||
        update.answer_images !== undefined
      ) {
        const repairedAnswerImages = repairLegacyImages(
          update.answerImages ?? update.answer_images,
          entityId,
          "answer",
        );

        if (repairedAnswerImages.changed) {
          update.answerImages = denormalizeUploadedImages(
            repairedAnswerImages.cleaned,
            {
              case: "camel",
              stripUndefined: true,
            },
          ) as unknown;

          if (update.answer_images !== undefined)
            Reflect.deleteProperty(update, "answer_images");
          changed = true;
        }
      }

      if (!update.createdAt) {
        update.createdAt = new Date();
        changed = true;
      }

      if (!update.updatedAt) {
        update.updatedAt =
          update.createdAt instanceof Date ? update.createdAt : new Date();
        changed = true;
      }

      if (changed) {
        cardsUpdated += 1;
        return update;
      }
      return null;
    })
    .filter(notNull);

  if (cardUpdates.length > 0) {
    await db.cards.bulkPut(
      cardUpdates as unknown as Parameters<typeof db.cards.bulkPut>[0],
    );
  }

  onProgress?.("復旧データの正規化完了");
  onProgress?.(
    `整合性修復完了: folders=${foldersUpdated}, cards=${cardsUpdated}, issues=${issues.length}`,
  );

  return {
    folders: foldersUpdated,
    cards: cardsUpdated,
    canonicalId: null,
    issues,
  };
};
