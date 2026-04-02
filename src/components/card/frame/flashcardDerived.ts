/**
 * Flashcard の派生データ計算・legacy フィールド正規化 (pure functions)
 *
 * - camelCase / snake_case 両対応
 * - legacy extra rows 吸収
 * - ink document resolve は含まない（副作用のある resolveInkDocument は呼び出し側）
 */
import {
  DEFAULT_LAYOUT_ROWS,
  LEGACY_BASE_LAYOUT_ROWS,
  normalizeExtraRows,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";
import { extractCardTextFromBlocks } from "@/domain/card/content";
import type { CardBlock, ReferenceBlockData } from "@/types/domain/card";

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
  } | null;
  back?: {
    blocks?: CardBlock[] | null;
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

export function resolveCardId(card: FlashcardCardLike): string | null {
  return card.id ?? card.cardId ?? null;
}

export function resolveHasUncertainty(card: FlashcardCardLike): boolean {
  return card.has_uncertainty ?? card.hasUncertainty ?? false;
}

export function resolveIsBookmarked(card: FlashcardCardLike): boolean {
  return card.is_bookmarked ?? card.isBookmarked ?? false;
}

export function resolveQuestionText(card: FlashcardCardLike): string {
  if (Array.isArray(card.front?.blocks)) {
    return extractCardTextFromBlocks(card.front.blocks);
  }
  return card.question_text ?? card.questionText ?? "";
}

export function resolveAnswerText(card: FlashcardCardLike): string {
  if (Array.isArray(card.back?.blocks)) {
    return extractCardTextFromBlocks(card.back.blocks);
  }
  return card.answer_text ?? card.answerText ?? "";
}

export function resolveQuestionImages(
  card: FlashcardCardLike,
): FlashcardMediaLike[] {
  if (Array.isArray(card.front?.blocks)) {
    return card.front.blocks
      .filter((block) => block.type === "image")
      .flatMap((block) => block.images ?? []);
  }
  return card.question_images ?? card.questionImages ?? [];
}

export function resolveAnswerImages(
  card: FlashcardCardLike,
): FlashcardMediaLike[] {
  if (Array.isArray(card.back?.blocks)) {
    return card.back.blocks
      .filter((block) => block.type === "image")
      .flatMap((block) => block.images ?? []);
  }
  return card.answer_images ?? card.answerImages ?? [];
}

export function resolveQuestionAudios(
  card: FlashcardCardLike,
): FlashcardMediaLike[] {
  if (Array.isArray(card.front?.blocks)) {
    return card.front.blocks
      .filter((block) => block.type === "audio")
      .flatMap((block) => block.audios ?? []);
  }
  return card.question_audios ?? card.questionAudios ?? [];
}

export function resolveAnswerAudios(
  card: FlashcardCardLike,
): FlashcardMediaLike[] {
  if (Array.isArray(card.back?.blocks)) {
    return card.back.blocks
      .filter((block) => block.type === "audio")
      .flatMap((block) => block.audios ?? []);
  }
  return card.answer_audios ?? card.answerAudios ?? [];
}

export function resolveQuestionCode(
  card: FlashcardCardLike,
): { code?: string; language?: string } | null {
  if (Array.isArray(card.front?.blocks)) {
    const codeBlock = card.front.blocks.find((block) => block.type === "code");
    if (codeBlock?.type === "code") return codeBlock.code ?? null;
  }
  return card.questionCode ?? card.question_code ?? null;
}

export function resolveAnswerCode(
  card: FlashcardCardLike,
): { code?: string; language?: string } | null {
  if (Array.isArray(card.back?.blocks)) {
    const codeBlock = card.back.blocks.find((block) => block.type === "code");
    if (codeBlock?.type === "code") return codeBlock.code ?? null;
  }
  return card.answerCode ?? card.answer_code ?? null;
}

// ---------------------------------------------------------------------------
// Layout rows
// ---------------------------------------------------------------------------

export function resolveLayoutRows(card: FlashcardCardLike): number {
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
}

// ---------------------------------------------------------------------------
// Image URL extraction
// ---------------------------------------------------------------------------

function toMediaUrl(m: FlashcardMediaLike): string | null {
  if (typeof m === "string") return m;
  return m.remoteUrl ?? m.localUrl ?? m.url ?? null;
}

export function resolveImageUrls(images: FlashcardMediaLike[]): string[] {
  return images
    .map((img) => toMediaUrl(img as FlashcardMediaLike))
    .filter((u): u is string => Boolean(u));
}

export function resolveAudioUrls(audios: FlashcardMediaLike[]): string[] {
  return audios
    .map(toMediaUrl)
    .filter((u): u is string => Boolean(u));
}

// ---------------------------------------------------------------------------
// Reference extraction
// ---------------------------------------------------------------------------

function extractReferences(block: CardBlock): ReferenceBlockData[] {
  const maybeBlock = block as CardBlock & { references?: unknown };
  const refs = maybeBlock.references;
  return Array.isArray(refs) ? (refs as ReferenceBlockData[]) : [];
}

export function resolveReferences(blocks: CardBlock[]): ReferenceBlockData[] {
  const refs: ReferenceBlockData[] = [];
  blocks.forEach((block) => {
    if (block.type === "reference") refs.push(...extractReferences(block));
  });
  return refs.filter((r) => r.url);
}











