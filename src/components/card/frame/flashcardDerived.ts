/**
 * Flashcard の派生データ計算・legacy フィールド正規化 (pure functions)
 *
 * - camelCase / snake_case 両対応
 * - legacy extra rows 吸収
 * - ink document resolve は含まない（副作用のある resolveInkDocument は呼び出し側）
 */
import type { FlashcardCardLike, FlashcardMediaLike } from "./flashcard.types";
import { extractCardTextFromBlocks } from "@/domain/card/content";
import { DEFAULT_LAYOUT_ROWS, LEGACY_BASE_LAYOUT_ROWS, normalizeExtraRows, normalizeLayoutRows } from "@/domain/card/extraRows";
import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardBlock } from "@/types/domain/card";



// ---------------------------------------------------------------------------
// Scalar field normalizers
// ---------------------------------------------------------------------------
const resolveCardId = (card: FlashcardCardLike) => {
  return card.id ?? card.cardId ?? null;
};
const resolveHasUncertainty = (card: FlashcardCardLike) => {
  return card.has_uncertainty ?? card.hasUncertainty ?? false;
};
const resolveIsBookmarked = (card: FlashcardCardLike) => {
  return card.is_bookmarked ?? card.isBookmarked ?? false;
};
const resolveQuestionText = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.blocks)) {
    return extractCardTextFromBlocks(card.front.blocks);
  }
  return card.question_text ?? card.questionText ?? "";
};
const resolveAnswerText = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.blocks)) {
    return extractCardTextFromBlocks(card.back.blocks);
  }
  return card.answer_text ?? card.answerText ?? "";
};
const resolveQuestionImages = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.blocks)) {
    return card.front.blocks.filter((block) => block.type === "image").flatMap((block) => block.images ?? []);
  }
  return card.question_images ?? card.questionImages ?? [];
};
const resolveAnswerImages = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.blocks)) {
    return card.back.blocks.filter((block) => block.type === "image").flatMap((block) => block.images ?? []);
  }
  return card.answer_images ?? card.answerImages ?? [];
};
const resolveQuestionAttachmentImages = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.attachments?.images)) {
    return card.front.attachments.images;
  }
  return card.question_images ?? card.questionImages ?? [];
};
const resolveAnswerAttachmentImages = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.attachments?.images)) {
    return card.back.attachments.images;
  }
  return card.answer_images ?? card.answerImages ?? [];
};
const resolveQuestionAudios = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.blocks)) {
    return card.front.blocks.filter((block) => block.type === "audio").flatMap((block) => block.audios ?? []);
  }
  return card.question_audios ?? card.questionAudios ?? [];
};
const resolveAnswerAudios = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.blocks)) {
    return card.back.blocks.filter((block) => block.type === "audio").flatMap((block) => block.audios ?? []);
  }
  return card.answer_audios ?? card.answerAudios ?? [];
};
const resolveQuestionAttachmentAudios = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.attachments?.audios)) {
    return card.front.attachments.audios;
  }
  return card.question_audios ?? card.questionAudios ?? [];
};
const resolveAnswerAttachmentAudios = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.attachments?.audios)) {
    return card.back.attachments.audios;
  }
  return card.answer_audios ?? card.answerAudios ?? [];
};
const resolveQuestionCode = (card: FlashcardCardLike) => {
  if (Array.isArray(card.front?.blocks)) {
    const codeBlock = card.front.blocks.find((block) => block.type === "code");
    if (codeBlock?.type === "code") return codeBlock.code ?? null;
  }
  return card.questionCode ?? card.question_code ?? null;
};
const resolveAnswerCode = (card: FlashcardCardLike) => {
  if (Array.isArray(card.back?.blocks)) {
    const codeBlock = card.back.blocks.find((block) => block.type === "code");
    if (codeBlock?.type === "code") return codeBlock.code ?? null;
  }
  return card.answerCode ?? card.answer_code ?? null;
};
// ---------------------------------------------------------------------------
// Layout rows
// ---------------------------------------------------------------------------
const resolveLayoutRows = (card: FlashcardCardLike) => {
  const legacyQ = normalizeExtraRows(card.questionExtraRows ?? card.question_extra_rows ?? 0);
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
const resolveImageUrls = (images: FlashcardMediaLike[]) => {
  return images.map((img) => toMediaUrl(img as FlashcardMediaLike)).filter((u): u is string => Boolean(u));
};
const resolveAudioUrls = (audios: FlashcardMediaLike[]) => {
  return audios.map(toMediaUrl).filter((u): u is string => Boolean(u));
};
const extractReferences = (block: CardBlock) => {
  const maybeBlock = block as CardBlock & { references?: unknown; };
  const refs = maybeBlock.references;
  return Array.isArray(refs) ? (refs as ReferenceBlockData[]) : [];
};
const resolveReferences = (blocks: CardBlock[]) => {
  const refs: ReferenceBlockData[] = [];
  blocks.forEach((block) => {
    if (block.type === "reference") refs.push(...extractReferences(block));
  });
  return refs.filter((r) => r.url);
};
const resolveQuestionAttachmentReferences = (card: FlashcardCardLike) => {
  return (card.front?.attachments?.references ?? []).filter((r) => r.url);
};
const resolveAnswerAttachmentReferences = (card: FlashcardCardLike) => {
  return (card.back?.attachments?.references ?? []).filter((r) => r.url);
};



export { resolveCardId, resolveHasUncertainty, resolveIsBookmarked, resolveQuestionText, resolveAnswerText, resolveQuestionImages, resolveAnswerImages, resolveQuestionAttachmentImages, resolveAnswerAttachmentImages, resolveQuestionAudios, resolveAnswerAudios, resolveQuestionAttachmentAudios, resolveAnswerAttachmentAudios, resolveQuestionCode, resolveAnswerCode, resolveLayoutRows, resolveImageUrls, resolveAudioUrls, resolveReferences, resolveQuestionAttachmentReferences, resolveAnswerAttachmentReferences };
