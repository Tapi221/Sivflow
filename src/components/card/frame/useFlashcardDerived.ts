import React from "react";
import type { FlashcardCardLike, FlashcardDerived, FlashcardMediaLike } from "./flashcard.types";
import { resolveSideBlocks } from "./flashcardBlocks";
import { resolveAnswerAttachmentAudios, resolveAnswerAttachmentImages, resolveAnswerAttachmentReferences, resolveAnswerAudios, resolveAnswerCode, resolveAnswerText, resolveAudioUrls, resolveCardId, resolveHasUncertainty, resolveImageUrls, resolveIsBookmarked, resolveLayoutRows, resolveQuestionAttachmentAudios, resolveQuestionAttachmentImages, resolveQuestionAttachmentReferences, resolveQuestionAudios, resolveQuestionCode, resolveQuestionText } from "./flashcardDerived";
import { resolveInkDocument } from "@/components/ink/inkStorage";
import type { CardBlock } from "@/types/domain/card";



const EMPTY_MEDIA_ITEMS: FlashcardMediaLike[] = [];
const EMPTY_IMAGE_URLS: string[] = [];
const EMPTY_AUDIO_URLS: string[] = [];
const EMPTY_REFERENCES: ReturnType<typeof resolveQuestionAttachmentReferences> =
  [];
const EMPTY_BLOCKS: ReturnType<typeof resolveSideBlocks> = [];



const useFlashcardDerived = (cardData: FlashcardCardLike | null | undefined, effectiveIsFlipped: boolean): FlashcardDerived => {
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



export { useFlashcardDerived };
