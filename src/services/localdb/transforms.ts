import { normalizeCard, normalizeFolder, extractTextFromBlocks } from '../../utils';
import { denormalizeUploadedImages, normalizeUploadedImages, sanitizeUploadedImages } from '../../utils/imageUtils';
import { sanitizeProfileImage } from '@/utils/profileImageSanitizer';
import { assertImageArrayInvariant } from '../../utils/imageAssertions';

export const denormalizeCardForStorage = (card: any) => {
  if (!card) return card;
  const result = { ...card };

  // ブロックが存在する場合、レガシーテキストフィールドを同期更新する
  if (card.questionBlocks !== undefined) {
    const extractedQ = extractTextFromBlocks(card.questionBlocks);
    result.questionText = extractedQ;
  }

  if (card.answerBlocks !== undefined) {
    result.answerText = extractTextFromBlocks(card.answerBlocks);
  }

  const sanitizeBlockImages = (blocks: any[] | undefined) => {
    if (!Array.isArray(blocks)) return blocks;
    return blocks.map((block) => {
      if (!block || typeof block !== 'object') return block;
      if (!Array.isArray((block as any).images)) return block;
      const sanitizedImages = (block as any).images.map((img: any) => {
        if (!img || typeof img !== 'object') return img;
        const assetId = img.assetId ?? img.id ?? null;
        const remoteUrl =
          typeof img.remoteUrl === 'string' && img.remoteUrl.startsWith('http')
            ? img.remoteUrl
            : null;
        return {
          id: img.id ?? assetId,
          assetId,
          remoteUrl,
          storagePath: img.storagePath ?? null,
          status: img.status ?? (remoteUrl ? 'ready' : 'uploading'),
          error: img.error ?? undefined,
          scale: img.scale ?? 1,
          x: img.x ?? 0,
          naturalW: img.naturalW ?? null,
          naturalH: img.naturalH ?? null,
        };
      });
      return { ...block, images: sanitizedImages };
    });
  };

  if (Array.isArray(card.questionBlocks)) {
    result.questionBlocks = sanitizeBlockImages(card.questionBlocks);
  }
  if (Array.isArray(card.answerBlocks)) {
    result.answerBlocks = sanitizeBlockImages(card.answerBlocks);
  }

  // 画像フィールドの変換（既存ロジック）
  if (card.questionImages !== undefined || card.question_images !== undefined) {
    const questionImages = normalizeUploadedImages(card.questionImages ?? card.question_images ?? []);
    try {
      assertImageArrayInvariant(questionImages as any);
    } catch (e) {
      console.warn('[LocalDB] questionImages validation failed, but proceeding with sanitization:', e);
    }
    const cleanQuestionImages = sanitizeUploadedImages(questionImages);
    result.questionImages = denormalizeUploadedImages(cleanQuestionImages, { case: 'camel', stripUndefined: true }) as any;
  }

  if (card.answerImages !== undefined || card.answer_images !== undefined) {
    const answerImages = normalizeUploadedImages(card.answerImages ?? card.answer_images ?? []);
    try {
      assertImageArrayInvariant(answerImages as any);
    } catch (e) {
      console.warn('[LocalDB] answerImages validation failed, but proceeding with sanitization:', e);
    }
    const cleanAnswerImages = sanitizeUploadedImages(answerImages);
    result.answerImages = denormalizeUploadedImages(cleanAnswerImages, { case: 'camel', stripUndefined: true }) as any;
  }

  return result;
};

export const denormalizeFolderForStorage = (folder: any) => {
  if (!folder) return folder;
  return { ...folder };
};

export const normalizeFolderWithSilent = (raw: any) => {
  if (!raw) return raw;
  const hasSilent = raw?.silent !== undefined;
  const hasIsSilent = raw?.isSilent !== undefined || raw?.is_silent !== undefined;
  const normalizedInput = !hasIsSilent && hasSilent
    ? { ...raw, isSilent: raw.silent }
    : raw;
  return normalizeFolder(normalizedInput);
};

export const denormalizeUserSettingsForStorage = (settings: any) => {
  if (!settings) return settings;
  const profileImage = sanitizeProfileImage(settings.profileImage).profileImage;

  return {
    ...settings,
    profileImage
  };
};

