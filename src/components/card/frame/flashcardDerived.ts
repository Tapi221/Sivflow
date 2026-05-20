/**
 * Flashcard の派生データ計算・legacy フィールド正規化 (pure functions)
 *
 * - camelCase / snake_case 両対応
 * - legacy extra rows 吸収
 * - ink document resolve は含まない（副作用のある resolveInkDocument は呼び出し側）
 */
import { extractCardTextFromBlocks } from "@/domain/card/content";
import {
  DEFAULT_LAYOUT_ROWS,
  LEGACY_BASE_LAYOUT_ROWS,
  normalizeExtraRows,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";

import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardBlock, CardFaceAttachments } from "@/types/domain/card";

export type FlashcardMediaLike =
  | string
  | {
    remoteUrl?: string | null;
    localUrl?: string | null;
    url?: string | null;
    localFileId?: string | null;
    assetId?: string | null;
  };

export type FlashcardCardLike = {
  id?: string;
  cardId?: string;
  has_uncertainty?: boolean;
  hasUncertainty?: boolean;
  is_bookmarked?: boolean;
  isBookmarked?: boolean;
  question_text?: string;
  questionText?: string;
  answer_text?: string;
  answerText?: string;
  question_images?: FlashcardMediaLike[];
  questionImages?: FlashcardMediaLike[];
  answer_images?: FlashcardMediaLike[];
  answerImages?: FlashcardMediaLike[];
  question_audios?: FlashcardMediaLike[];
  questionAudios?: FlashcardMediaLike[];
  answer_audios?: FlashcardMediaLike[];
  answerAudios?: FlashcardMediaLike[];
  questionCode?: { code?: string; language?: string } | null;
  question_code?: { code?: string; language?: string } | null;
  answerCode?: { code?: string; language?: string } | null;
  answer_code?: { code?: string; language?: string } | null;
  frontBlocks?: CardBlock[];
  backBlocks?: CardBlock[];
  front?: {
    blocks?: CardBlock[] | null;
    attachments?: CardFaceAttachments | null;
    ink?: import("@/components/ink/inkTypes").InkDocument | null;
  } | null;
  back?: {
    blocks?: CardBlock[] | null;
    attachments?: CardFaceAttachments | null;
    ink?: import("@/components/ink/inkTypes").InkDocument | null;
  } | null;
  layoutRows?: number;
  layout_rows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  questionExtraRows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  question_extra_rows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  answerExtraRows?: number;
  /** @deprecated Read-only legacy field. Use layoutRows/layout_rows. */
  answer_extra_rows?: number;
  inkQuestion?: import("@/components/ink/inkTypes").InkDocument | null;
  inkAnswer?: import("@/components/ink/inkTypes").InkDocument | null;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Scalar field normalizers
// ---------------------------------------------------------------------------

export const resolveCardId = (card: FlashcardCardLike) => {
  return card.id ?? card.cardId ?? null;
};

export const resolveHasUncertainty = (card: FlashcardCardLike) => {
  return card.has_uncertainty ?? card.hasUncertainty ?? false;
};

export const resolveIsBookmarked = (card: FlashcardCardLike) => {
  return card.is_bookmarked ?? card.isBookmarked ?? false;
};

export const resolveQuestionText = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.blocks)) {
    return extractCardTextFromBlocks(card.front.blocks);
  }
  return card.question_text ?? card.questionText ?? "";
};

export const resolveAnswerText = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.blocks)) {
    return extractCardTextFromBlocks(card.back.blocks);
  }
  return card.answer_text ?? card.answerText ?? "";
};

export const resolveQuestionImages = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.blocks)) {
    return card.front.blocks
      .filter((block) => block.type === "image")
      .flatMap((block) => block.images ?? []);
  }
  return card.question_images ?? card.questionImages ?? [];
};

export const resolveAnswerImages = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.blocks)) {
    return card.back.blocks
      .filter((block) => block.type === "image")
      .flatMap((block) => block.images ?? []);
  }
  return card.answer_images ?? card.answerImages ?? [];
};

export const resolveQuestionAttachmentImages = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.attachments?.images)) {
    return card.front.attachments.images;
  }
  return card.question_images ?? card.questionImages ?? [];
};

export const resolveAnswerAttachmentImages = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.attachments?.images)) {
    return card.back.attachments.images;
  }
  return card.answer_images ?? card.answerImages ?? [];
};

export const resolveQuestionAudios = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.blocks)) {
    return card.front.blocks
      .filter((block) => block.type === "audio")
      .flatMap((block) => block.audios ?? []);
  }
  return card.question_audios ?? card.questionAudios ?? [];
};

export const resolveAnswerAudios = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.blocks)) {
    return card.back.blocks
      .filter((block) => block.type === "audio")
      .flatMap((block) => block.audios ?? []);
  }
  return card.answer_audios ?? card.answerAudios ?? [];
};

export const resolveQuestionAttachmentAudios = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.attachments?.audios)) {
    return card.front.attachments.audios;
  }
  return card.question_audios ?? card.questionAudios ?? [];
};

export const resolveAnswerAttachmentAudios = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.attachments?.audios)) {
    return card.back.attachments.audios;
  }
  return card.answer_audios ?? card.answerAudios ?? [];
};

export const resolveQuestionCode = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.blocks)) {
    const codeBlock = card.front.blocks.find((block) => block.type === "code");
    if (codeBlock?.type === "code") return codeBlock.code ?? null;
  }
  return card.questionCode ?? card.question_code ?? null;
};

export const resolveAnswerCode = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.blocks)) {
    const codeBlock = card.back.blocks.find((block) => block.type === "code");
    if (codeBlock?.type === "code") return codeBlock.code ?? null;
  }
  return card.answerCode ?? card.answer_code ?? null;
};

// ---------------------------------------------------------------------------
// Layout rows
// ---------------------------------------------------------------------------

export const resolveLayoutRows = (card: FlashcardCardLike) => {
  const legacyQ = normalizeExtraRows(
    card.questionExtraRows ?? card.question_extra_rows ?? 0,
  );
  const legacyA = normalizeExtraRows(
    card.answerExtraRows ?? card.answer_extra_rows ?? 0,
  );

  const raw =
    card.layoutRows ??
    card.layout_rows ??
    LEGACY_BASE_LAYOUT_ROWS + Math.max(legacyQ, legacyA);

  const safe = Number.isFinite(raw) ? raw : DEFAULT_LAYOUT_ROWS;
  return normalizeLayoutRows(safe);
};

const toMediaUrl = (m: FlashcardMediaLike) => {
  if (typeof m === "string") return m;
  return m.remoteUrl ?? m.localUrl ?? m.url ?? null;
};

export const resolveImageUrls = (images: FlashcardMediaLike[]) => {
  return images
    .map((img) => toMediaUrl(img as FlashcardMediaLike))
    .filter((u): u is string => Boolean(u));
};

export const resolveAudioUrls = (audios: FlashcardMediaLike[]) => {
  return audios.map(toMediaUrl).filter((u): u is string => Boolean(u));
};

const extractReferences = (block: CardBlock) => {
  const maybeBlock = block as CardBlock & { references?: unknown };
  const refs = maybeBlock.references;
  return Array.isArray(refs) ? (refs as ReferenceBlockData[]) : [];
};

export const resolveReferences = (blocks: CardBlock[]) => {
  const refs: ReferenceBlockData[] = [];
  blocks.forEach((block) => {
    if (block.type === "reference") refs.push(...extractReferences(block));
  });
  return refs.filter((r) => r.url);
};

export const resolveQuestionAttachmentReferences = (
  card: FlashcardCardLike,
) => {
  return (card.front?.attachments?.references ?? []).filter((r) => r.url);
};

export const resolveAnswerAttachmentReferences = (card: FlashcardCardLike) => {
  return (card.back?.attachments?.references ?? []).filter((r) => r.url);
};
