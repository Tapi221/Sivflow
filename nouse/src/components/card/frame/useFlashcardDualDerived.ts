import React from "react";
import type { FlashcardCardLike, FlashcardDualDerivedSnapshot, FlashcardMediaLike, FlashcardSideDerivedSnapshot } from "./flashcard.types";
import { resolveSideBlocks } from "./flashcardBlocks";
import { resolveAnswerAttachmentAudios, resolveAnswerAttachmentImages, resolveAnswerAttachmentReferences, resolveAnswerCode, resolveAnswerText, resolveAudioUrls, resolveCardId, resolveHasUncertainty, resolveImageUrls, resolveIsBookmarked, resolveLayoutRows, resolveQuestionAttachmentAudios, resolveQuestionAttachmentImages, resolveQuestionAttachmentReferences, resolveQuestionCode, resolveQuestionText } from "./flashcardDerived";
import { resolveInkDocument } from "@/components/ink/inkStorage";
import type { CardBlock } from "@/types/domain/card";



const EMPTY_MEDIA_ITEMS: FlashcardMediaLike[] = [];
const EMPTY_IMAGE_URLS: string[] = [];
const EMPTY_AUDIO_URLS: string[] = [];
const EMPTY_REFERENCES: ReturnType<typeof resolveQuestionAttachmentReferences> =
  [];
const EMPTY_BLOCKS: ReturnType<typeof resolveSideBlocks> = [];



const resolveSourceBlocks = (
  cardData: FlashcardCardLike | null | undefined,
  side: "question" | "answer",
) => {
  if (!cardData) {
    return [] as CardBlock[];
  }

  return side === "question"
    ? ((cardData.front?.blocks ?? []) as CardBlock[])
    : ((cardData.back?.blocks ?? []) as CardBlock[]);
};
const buildSideSnapshot = ({
  cardData,
  cardId,
  side,
}: {
  cardData: FlashcardCardLike | null | undefined;
  cardId: string | null;
  side: "question" | "answer";
}): FlashcardSideDerivedSnapshot => {
  if (!cardData) {
    return {
      activeSide: side,
      activeImageItems: EMPTY_MEDIA_ITEMS,
      activeImages: EMPTY_IMAGE_URLS,
      activeAudioUrls: EMPTY_AUDIO_URLS,
      activeReferences: EMPTY_REFERENCES,
      activeBlocks: EMPTY_BLOCKS,
      activeInkDocument: resolveInkDocument(cardId, side, null),
    };
  }

  const activeImageItems =
    side === "question"
      ? resolveQuestionAttachmentImages(cardData)
      : resolveAnswerAttachmentImages(cardData);

  const activeAudioItems =
    side === "question"
      ? resolveQuestionAttachmentAudios(cardData)
      : resolveAnswerAttachmentAudios(cardData);

  const activeReferences =
    side === "question"
      ? resolveQuestionAttachmentReferences(cardData)
      : resolveAnswerAttachmentReferences(cardData);

  const activeSourceBlocks = resolveSourceBlocks(cardData, side);
  const activeText =
    side === "question"
      ? resolveQuestionText(cardData)
      : resolveAnswerText(cardData);

  const activeCode =
    side === "question"
      ? resolveQuestionCode(cardData)
      : resolveAnswerCode(cardData);

  return {
    activeSide: side,
    activeImageItems,
    activeImages:
      activeImageItems.length > 0
        ? resolveImageUrls(activeImageItems)
        : EMPTY_IMAGE_URLS,
    activeAudioUrls:
      activeAudioItems.length > 0
        ? resolveAudioUrls(activeAudioItems)
        : EMPTY_AUDIO_URLS,
    activeReferences,
    activeBlocks: resolveSideBlocks(side, {
      blocks: activeSourceBlocks,
      text: activeText,
      audios: activeAudioItems,
      code: activeCode,
    }),
    activeInkDocument: resolveInkDocument(
      cardId,
      side,
      side === "question"
        ? (cardData.front?.ink ?? null)
        : (cardData.back?.ink ?? null),
    ),
  };
};
const useFlashcardDualDerived = (cardData: FlashcardCardLike | null | undefined) => {
  return React.useMemo<FlashcardDualDerivedSnapshot>(() => {
    const cardId = cardData ? resolveCardId(cardData) : null;

    return {
      cardId,
      hasUncertainty: cardData ? resolveHasUncertainty(cardData) : false,
      isBookmarked: cardData ? resolveIsBookmarked(cardData) : false,
      layoutRows: cardData ? resolveLayoutRows(cardData) : 0,
      question: buildSideSnapshot({
        cardData,
        cardId,
        side: "question",
      }),
      answer: buildSideSnapshot({
        cardData,
        cardId,
        side: "answer",
      }),
    };
  }, [cardData]);
};



export { useFlashcardDualDerived };
