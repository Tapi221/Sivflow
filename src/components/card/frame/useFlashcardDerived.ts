/**
 * Flashcard の派生データ（active-side に依存するものを含む）を集約した hook。
 *
 * - cardData の null/undefined ガードを一箇所に寄せる
 * - effectiveIsFlipped に基づく active-side 選択を一元管理
 * - useMemo の deps は既存パターンに準拠
 */
import React from "react";

import { resolveInkDocument } from "@/components/ink/inkStorage";

import { resolveSideBlocks } from "./flashcardBlocks";
import {
  type FlashcardCardLike,
  type FlashcardMediaLike,
  resolveAnswerAttachmentAudios,
  resolveAnswerAttachmentImages,
  resolveAnswerAttachmentReferences,
  resolveAnswerAudios,
  resolveAnswerCode,
  resolveAnswerText,
  resolveAudioUrls,
  resolveCardId,
  resolveHasUncertainty,
  resolveImageUrls,
  resolveIsBookmarked,
  resolveLayoutRows,
  resolveQuestionAttachmentAudios,
  resolveQuestionAttachmentImages,
  resolveQuestionAttachmentReferences,
  resolveQuestionAudios,
  resolveQuestionCode,
  resolveQuestionText,
} from "./flashcardDerived";

import type { CardBlock } from "@/types/domain/card";

export interface FlashcardDerived {
  cardId: string | null;
  hasUncertainty: boolean;
  isBookmarked: boolean;
  layoutRows: number;
  activeSide: "question" | "answer";
  activeImageItems: FlashcardMediaLike[];
  activeImages: string[];
  activeAudioUrls: string[];
  activeReferences: ReturnType<typeof resolveQuestionAttachmentReferences>;
  activeBlocks: ReturnType<typeof resolveSideBlocks>;
  activeInkDocument: ReturnType<typeof resolveInkDocument>;
}

const EMPTY_MEDIA_ITEMS: FlashcardMediaLike[] = [];
const EMPTY_IMAGE_URLS: string[] = [];
const EMPTY_AUDIO_URLS: string[] = [];
const EMPTY_REFERENCES: ReturnType<typeof resolveQuestionAttachmentReferences> =
  [];
const EMPTY_BLOCKS: ReturnType<typeof resolveSideBlocks> = [];

export const useFlashcardDerived = (
  cardData: FlashcardCardLike | null | undefined,
  effectiveIsFlipped: boolean,
) => {
  const cardId = cardData ? resolveCardId(cardData) : null;

  const hasUncertainty = cardData ? resolveHasUncertainty(cardData) : false;
  const isBookmarked = cardData ? resolveIsBookmarked(cardData) : false;
  const layoutRows = cardData ? resolveLayoutRows(cardData) : 0;

  const activeSide: "question" | "answer" = effectiveIsFlipped
    ? "answer"
    : "question";

  const activeImageItems = React.useMemo(() => {
    if (!cardData) return EMPTY_MEDIA_ITEMS;
    return activeSide === "question"
      ? resolveQuestionAttachmentImages(cardData)
      : resolveAnswerAttachmentImages(cardData);
  }, [activeSide, cardData]);

  const activeImages = React.useMemo(
    () =>
      activeImageItems.length > 0
        ? resolveImageUrls(activeImageItems)
        : EMPTY_IMAGE_URLS,
    [activeImageItems],
  );

  const activeAttachmentAudios = React.useMemo(() => {
    if (!cardData) return EMPTY_MEDIA_ITEMS;
    return activeSide === "question"
      ? resolveQuestionAttachmentAudios(cardData)
      : resolveAnswerAttachmentAudios(cardData);
  }, [activeSide, cardData]);

  const activeAudioUrls = React.useMemo(
    () =>
      activeAttachmentAudios.length > 0
        ? resolveAudioUrls(activeAttachmentAudios)
        : EMPTY_AUDIO_URLS,
    [activeAttachmentAudios],
  );

  const activeSourceBlocks = React.useMemo(
    () =>
      activeSide === "question"
        ? ((cardData?.front?.blocks ?? []) as CardBlock[])
        : ((cardData?.back?.blocks ?? []) as CardBlock[]),
    [activeSide, cardData?.back?.blocks, cardData?.front?.blocks],
  );

  const activeReferences = React.useMemo(() => {
    if (!cardData) return EMPTY_REFERENCES;
    return activeSide === "question"
      ? resolveQuestionAttachmentReferences(cardData)
      : resolveAnswerAttachmentReferences(cardData);
  }, [activeSide, cardData]);

  const activeBlockAudios = React.useMemo(() => {
    if (!cardData) return EMPTY_MEDIA_ITEMS;
    return activeSide === "question"
      ? resolveQuestionAudios(cardData)
      : resolveAnswerAudios(cardData);
  }, [activeSide, cardData]);

  const activeText = React.useMemo(() => {
    if (!cardData) return "";
    return activeSide === "question"
      ? resolveQuestionText(cardData)
      : resolveAnswerText(cardData);
  }, [activeSide, cardData]);

  const activeCode = React.useMemo(() => {
    if (!cardData) return null;
    return activeSide === "question"
      ? resolveQuestionCode(cardData)
      : resolveAnswerCode(cardData);
  }, [activeSide, cardData]);

  const activeInkDocument = React.useMemo(
    () =>
      resolveInkDocument(
        cardId,
        activeSide,
        activeSide === "question"
          ? (cardData?.front?.ink ?? null)
          : (cardData?.back?.ink ?? null),
      ),
    [activeSide, cardData?.back?.ink, cardData?.front?.ink, cardId],
  );

  const activeBlocks = React.useMemo(() => {
    if (!cardData) return EMPTY_BLOCKS;
    return resolveSideBlocks(activeSide, {
      blocks: activeSourceBlocks,
      text: activeText,
      audios: activeBlockAudios,
      code: activeCode,
    });
  }, [
    activeSide,
    activeBlockAudios,
    activeCode,
    activeSourceBlocks,
    activeText,
    cardData,
  ]);

  return {
    cardId,
    hasUncertainty,
    isBookmarked,
    layoutRows,
    activeSide,
    activeImageItems,
    activeImages,
    activeAudioUrls,
    activeReferences,
    activeBlocks,
    activeInkDocument,
  };
};
