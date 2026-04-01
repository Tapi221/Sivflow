/**
 * Flashcard の派生データ（active-side に依存するものを含む）を集約した hook。
 *
 * - cardData の null/undefined ガードを一箇所に寄せる
 * - effectiveIsFlipped に基づく active-side 選択を一元管理
 * - useMemo の deps は既存パターンに準拠
 */
import { resolveInkDocument } from "@/components/ink/inkStorage";
import type { CardBlock } from "@/types/domain/card";
import React from "react";
import { resolveSideBlocks } from "./flashcardBlocks";
import {
  type FlashcardCardLike,
  type FlashcardMediaLike,
  resolveAnswerAudios,
  resolveAnswerCode,
  resolveAnswerImages,
  resolveAnswerText,
  resolveAudioUrls,
  resolveCardId,
  resolveHasUncertainty,
  resolveImageUrls,
  resolveIsBookmarked,
  resolveLayoutRows,
  resolveQuestionAudios,
  resolveQuestionCode,
  resolveQuestionImages,
  resolveQuestionText,
  resolveReferences,
} from "./flashcardDerived";

export interface FlashcardDerived {
  cardId: string | null;
  hasUncertainty: boolean;
  isBookmarked: boolean;
  layoutRows: number;
  activeSide: "question" | "answer";
  activeImageItems: FlashcardMediaLike[];
  activeImages: string[];
  activeAudioUrls: string[];
  activeReferences: ReturnType<typeof resolveReferences>;
  activeBlocks: ReturnType<typeof resolveSideBlocks>;
  activeInkDocument: ReturnType<typeof resolveInkDocument>;
}

const EMPTY_MEDIA_ITEMS: FlashcardMediaLike[] = [];
const EMPTY_IMAGE_URLS: string[] = [];
const EMPTY_AUDIO_URLS: string[] = [];
const EMPTY_REFERENCES: ReturnType<typeof resolveReferences> = [];
const EMPTY_BLOCKS: ReturnType<typeof resolveSideBlocks> = [];

export function useFlashcardDerived(
  cardData: FlashcardCardLike | null | undefined,
  effectiveIsFlipped: boolean,
): FlashcardDerived {
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
      ? resolveQuestionImages(cardData)
      : resolveAnswerImages(cardData);
  }, [activeSide, cardData]);

  const activeImages = React.useMemo(
    () =>
      activeImageItems.length > 0
        ? resolveImageUrls(activeImageItems)
        : EMPTY_IMAGE_URLS,
    [activeImageItems],
  );

  const activeAudios = React.useMemo(() => {
    if (!cardData) return EMPTY_MEDIA_ITEMS;
    return activeSide === "question"
      ? resolveQuestionAudios(cardData)
      : resolveAnswerAudios(cardData);
  }, [activeSide, cardData]);

  const activeAudioUrls = React.useMemo(
    () =>
      activeAudios.length > 0 ? resolveAudioUrls(activeAudios) : EMPTY_AUDIO_URLS,
    [activeAudios],
  );

  const activeSourceBlocks = React.useMemo(
    () =>
      activeSide === "question"
        ? ((cardData?.frontBlocks?? []) as CardBlock[])
        : ((cardData?.backBlocks ?? []) as CardBlock[]),
    [activeSide, cardData?.backBlocks, cardData?.frontBlocks],
  );

  const activeReferences = React.useMemo(
    () =>
      activeSourceBlocks.length > 0
        ? resolveReferences(activeSourceBlocks)
        : EMPTY_REFERENCES,
    [activeSourceBlocks],
  );

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
          ? cardData?.inkQuestion ?? null
          : cardData?.inkAnswer ?? null,
      ),
    [activeSide, cardData?.inkAnswer, cardData?.inkQuestion, cardId],
  );

  const activeBlocks = React.useMemo(
    () => {
      if (!cardData) return EMPTY_BLOCKS;
      return resolveSideBlocks(activeSide, {
        blocks: activeSourceBlocks,
        text: activeText,
        audios: activeAudios,
        code: activeCode,
      });
    },
    [
      activeSide,
      activeAudios,
      activeCode,
      activeSourceBlocks,
      activeText,
      cardData,
    ],
  );

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
}










