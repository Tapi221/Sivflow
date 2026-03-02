import type { LocalDB } from './LocalDB';
import { normalizeUploadedImages, denormalizeUploadedImages } from '../../utils/imageUtils';
import type { IntegrityIssue, IntegrityRepairResult } from '../dataIntegrityTypes';
import { sanitizeForLog } from '@/utils/logSanitizer';

export async function repairDataIntegrity(
  db: LocalDB,
  currentUserId: string,
  onProgress?: (msg: string) => void
): Promise<IntegrityRepairResult> {
  const issues: IntegrityIssue[] = [];

  const normalizedTimestamp = (value: unknown): Date | null => {
    if (value == null || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
      try {
        const dt = (value as any).toDate();
        return dt instanceof Date && !Number.isNaN(dt.getTime()) ? dt : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const extractSideText = (blocks: any[], side: 'question' | 'answer'): string | null => {
    const b = blocks.find((block) => {
      const role = String(block?.side ?? block?.role ?? '').toLowerCase();
      const type = String(block?.type ?? '').toLowerCase();
      return role === side || type === side || type === `${side}_text`;
    });
    const text = b?.text;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  };

  const pushBlobRepairIssue = (entityId: string, side: 'question' | 'answer', details: Record<string, unknown>) => {
    issues.push({
      code: 'MISSING_REQUIRED_FIELD',
      entityType: 'card',
      entityId,
      severity: 'warning',
      fixed: true,
      details: {
        side,
        ...details,
      },
    });
  };

  const getAnyBlocks = (cardRecord: any, side: 'question' | 'answer') => {
    if (side === 'question') return cardRecord.questionBlocks ?? cardRecord.question_blocks ?? [];
    return cardRecord.answerBlocks ?? cardRecord.answer_blocks ?? [];
  };

  const resolveImageUrls = (img: any) => {
    const localUrl = typeof img?.localUrl === 'string'
      ? img.localUrl
      : typeof img?.local_url === 'string'
        ? img.local_url
        : null;
    const remoteUrl = typeof img?.remoteUrl === 'string'
      ? img.remoteUrl
      : typeof img?.remote_url === 'string'
        ? img.remote_url
        : typeof img?.url === 'string'
          ? img.url
          : null;
    return { localUrl, remoteUrl };
  };

  const makeMissingLocalImage = (img: any, remoteUrl: string | null) => {
    const hasRemote = typeof remoteUrl === 'string' && remoteUrl.trim().length > 0;
    return {
      ...img,
      localUrl: null,
      local_url: null,
      status: hasRemote ? (img?.status ?? 'ready') : 'failed',
      error: hasRemote ? img?.error : '画像が端末内に存在しません。再添付してください。',
    };
  };

  const repairBlockImages = (blocks: any[], entityId: string, side: 'question' | 'answer') => {
    if (!Array.isArray(blocks) || blocks.length === 0) return { blocks, changed: false };
    let changed = false;
    const repairedBlocks = blocks.map((block: any) => {
      if (!block || typeof block !== 'object') return block;
      let nextBlock = block;
      let blockChanged = false;

      if (Array.isArray(block.images)) {
        const repairedImages = block.images.map((img: any) => {
          if (!img || typeof img !== 'object') return img;
          const { localUrl, remoteUrl } = resolveImageUrls(img);
          if (!localUrl?.startsWith('blob:')) return img;
          blockChanged = true;
          pushBlobRepairIssue(entityId, side, {
            blockId: block.id ?? null,
            imageId: img.id ?? null,
            reason: 'removed_persisted_blob_url',
          });
          return makeMissingLocalImage(img, remoteUrl);
        });
        if (blockChanged) {
          nextBlock = { ...nextBlock, images: repairedImages };
        }
      }

      const blockStringFields = ['src', 'url', 'localUrl', 'local_url'] as const;
      for (const key of blockStringFields) {
        const value = (nextBlock as any)?.[key];
        if (typeof value !== 'string' || !value.startsWith('blob:')) continue;
        blockChanged = true;
        pushBlobRepairIssue(entityId, side, {
          blockId: block.id ?? null,
          reason: 'removed_persisted_blob_url_block_field',
          field: key,
        });
        (nextBlock as any)[key] = null;
        (nextBlock as any).status = 'failed';
        (nextBlock as any).error = '画像が端末内に存在しません。再添付してください。';
      }

      if (!blockChanged) return block;
      changed = true;
      return nextBlock;
    });
    return { blocks: repairedBlocks, changed };
  };

  const repairLegacyImages = (imagesRaw: unknown, entityId: string, side: 'question' | 'answer') => {
    const normalized = normalizeUploadedImages(imagesRaw ?? []);
    if (normalized.length === 0) return { cleaned: normalized, changed: false };

    let changed = false;
    const cleaned = normalized.map((img: any) => {
      const localUrl = typeof img?.localUrl === 'string' ? img.localUrl : null;
      if (!localUrl?.startsWith('blob:')) return img;
      changed = true;
      pushBlobRepairIssue(entityId, side, {
        imageId: img.id ?? null,
        reason: 'removed_persisted_blob_url_legacy_array',
      });
      const hasRemote = typeof img?.remoteUrl === 'string' && img.remoteUrl.trim().length > 0;
      return {
        ...img,
        localUrl: null,
        status: hasRemote ? (img.status ?? 'ready') : 'failed',
        error: hasRemote ? img.error : '画像が端末内に存在しません。再添付してください。',
      };
    });

    return { cleaned, changed };
  };

  console.log('[Repair] Starting data integrity repair');
  onProgress?.('整合性修復を開始...');

  const allFolders = await db.folders.toArray();
  const allCards = await db.cards.toArray();
  const rescueFolderId = 'RESCUE_ORPHANS_FOLDER';

  let foldersUpdated = 0;
  let cardsUpdated = 0;
  const folderIds = new Set(allFolders.map((f: any) => String(f?.id ?? f?.folderId ?? '')).filter(Boolean));

  const folderUpdates = allFolders.map((folder) => {
    const update = { ...folder } as any;
    let changed = false;
    if (!update.id) {
      update.id = update.folderId || crypto.randomUUID();
      changed = true;
    }
    if (!update.folderId) {
      update.folderId = update.id;
      changed = true;
    }
    if (!update.userId) {
      update.userId = currentUserId;
      changed = true;
    }
    if (update.parentFolderId === undefined) {
      update.parentFolderId = null;
      changed = true;
    }
    const name = update.folderName || update.name || update.folder_name;
    if (!name) {
      update.folderName = 'Recovered Folder';
      changed = true;
    } else if (!update.folderName) {
      update.folderName = name;
      changed = true;
    }
    if (changed) {
      foldersUpdated += 1;
      return update;
    }
    return null;
  }).filter(Boolean);
  if (folderUpdates.length > 0) {
    await db.folders.bulkPut(folderUpdates as any[]);
  }

  if (!folderIds.has(rescueFolderId)) {
    await db.folders.put({
      id: rescueFolderId,
      folderId: rescueFolderId,
      folderName: 'Recovered Folder',
      userId: currentUserId,
      parentFolderId: null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    folderIds.add(rescueFolderId);
    foldersUpdated += 1;
  }

  onProgress?.('カード不整合を修復中...');
  const cardUpdates = allCards.map((card) => {
    const update = { ...card } as any;
    const entityId = String(update.id ?? update.cardId ?? 'unknown');
    let changed = false;

    if (!update.id) {
      update.id = update.cardId || update.card_id || crypto.randomUUID();
      changed = true;
    }
    if (update.userId !== currentUserId) {
      update.userId = currentUserId;
      changed = true;
    }

    const hasDeletedAt = update.deletedAt != null;
    const isDeleted = Boolean(update.isDeleted ?? update.is_deleted ?? update.deleted);
    if (hasDeletedAt !== isDeleted) {
      update.isDeleted = hasDeletedAt;
      changed = true;
      issues.push({
        code: 'DELETED_FLAG_MISMATCH',
        entityType: 'card',
        entityId,
        severity: 'warning',
        fixed: true,
        details: { hasDeletedAt, isDeletedBefore: isDeleted, isDeletedAfter: hasDeletedAt },
      });
    }
    if (update.is_deleted !== undefined) { delete update.is_deleted; changed = true; }
    if (update.deleted !== undefined) { delete update.deleted; changed = true; }

    const timestampFields = ['createdAt', 'updatedAt', 'deletedAt', 'nextReviewDate', 'lastReviewAt'];
    for (const key of timestampFields) {
      const raw = update[key];
      if (raw == null) continue;
      const normalized = normalizedTimestamp(raw);
      if (!normalized) continue;
      if (!(raw instanceof Date)) {
        update[key] = normalized;
        changed = true;
        issues.push({
          code: 'TIMESTAMP_TYPE_MIXED',
          entityType: 'card',
          entityId,
          severity: 'info',
          fixed: true,
          details: { field: key, originalType: typeof raw },
        });
      }
    }

    const missingFolder = update.folderId === undefined || update.folderId === null || String(update.folderId).trim() === '';
    if (!update.isDeleted && missingFolder) {
      update.folderId = rescueFolderId;
      changed = true;
      issues.push({
        code: 'MISSING_FOLDER',
        entityType: 'card',
        entityId,
        severity: 'error',
        fixed: true,
        details: { assignedFolderId: rescueFolderId },
      });
    }

    const blocks = Array.isArray(update.blocks) ? update.blocks.map((b: any) => ({ ...b })) : [];
    if (blocks.length > 0) {
      let blockChanged = false;
      blocks.forEach((block: any, index: number) => {
        if (typeof block.orderIndex !== 'number') {
          block.orderIndex = index;
          blockChanged = true;
        }
      });
      if (blockChanged) {
        update.blocks = blocks;
        changed = true;
        issues.push({
          code: 'BLOCK_ORDER_INDEX_MISSING',
          entityType: 'card',
          entityId,
          severity: 'warning',
          fixed: true,
          details: { blockCount: blocks.length },
        });
      }

      const qBlockText = extractSideText(blocks, 'question');
      const aBlockText = extractSideText(blocks, 'answer');
      const qText = typeof update.questionText === 'string' ? update.questionText.trim() : '';
      const aText = typeof update.answerText === 'string' ? update.answerText.trim() : '';
      const hasQMismatch = Boolean(qBlockText && qText && qBlockText !== qText);
      const hasAMismatch = Boolean(aBlockText && aText && aBlockText !== aText);
      if (hasQMismatch || hasAMismatch) {
        if (qBlockText) update.questionText = qBlockText;
        if (aBlockText) update.answerText = aBlockText;
        changed = true;
        issues.push({
          code: 'TEXT_BLOCK_MISMATCH',
          entityType: 'card',
          entityId,
          severity: 'warning',
          fixed: true,
          details: { hasQuestionMismatch: hasQMismatch, hasAnswerMismatch: hasAMismatch },
        });
      }
    }

    const questionBlocksRaw = getAnyBlocks(update, 'question');
    const answerBlocksRaw = getAnyBlocks(update, 'answer');

    const questionBlockRepair = repairBlockImages(questionBlocksRaw, entityId, 'question');
    if (questionBlockRepair.changed) {
      update.questionBlocks = questionBlockRepair.blocks;
      if (update.question_blocks !== undefined) delete update.question_blocks;
      changed = true;
    }
    const answerBlockRepair = repairBlockImages(answerBlocksRaw, entityId, 'answer');
    if (answerBlockRepair.changed) {
      update.answerBlocks = answerBlockRepair.blocks;
      if (update.answer_blocks !== undefined) delete update.answer_blocks;
      changed = true;
    }

    if (update.questionImages !== undefined || update.question_images !== undefined) {
      const repairedQuestionImages = repairLegacyImages(
        update.questionImages ?? update.question_images,
        entityId,
        'question'
      );
      if (repairedQuestionImages.changed) {
        update.questionImages = denormalizeUploadedImages(repairedQuestionImages.cleaned, {
          case: 'camel',
          stripUndefined: true,
        }) as any;
        if (update.question_images !== undefined) delete update.question_images;
        changed = true;
      }
    }

    if (update.answerImages !== undefined || update.answer_images !== undefined) {
      const repairedAnswerImages = repairLegacyImages(
        update.answerImages ?? update.answer_images,
        entityId,
        'answer'
      );
      if (repairedAnswerImages.changed) {
        update.answerImages = denormalizeUploadedImages(repairedAnswerImages.cleaned, {
          case: 'camel',
          stripUndefined: true,
        }) as any;
        if (update.answer_images !== undefined) delete update.answer_images;
        changed = true;
      }
    }

    if (!update.createdAt) {
      update.createdAt = new Date();
      changed = true;
    }
    if (!update.updatedAt) {
      update.updatedAt = update.createdAt || new Date();
      changed = true;
    }

    if (changed) {
      cardsUpdated += 1;
      return update;
    }
    return null;
  }).filter(Boolean);

  if (cardUpdates.length > 0) {
    await db.cards.bulkPut(cardUpdates as any[]);
  }

  onProgress?.('復旧データの正規化完了');
  console.log('[Repair] Completed', sanitizeForLog({ foldersUpdated, cardsUpdated, issueCount: issues.length }));
  return { folders: foldersUpdated, cards: cardsUpdated, canonicalId: null, issues };
}
