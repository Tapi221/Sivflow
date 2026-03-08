/**
 * Flashcard の派生データ（active-side に依存するものを含む）を集約した hook。
 *
 * - cardData の null/undefined ガードを一箇所に寄せる
 * - effectiveIsFlipped に基づく active-side 選択を一元管理
 * - useMemo の deps は既存パターンに準拠
 */
import React from "react";
import { resolveInkDocument } from "@/components/ink/inkStorage";
import {
  type FlashcardCardLike,
  resolveCardId,
  resolveHasUncertainty,
  resolveIsBookmarked,
  resolveQuestionText,
  resolveAnswerText,
  resolveQuestionImages,
  resolveAnswerImages,
  resolveQuestionAudios,
  resolveAnswerAudios,
  resolveQuestionCode,
  resolveAnswerCode,
  resolveLayoutRows,
  resolveImageUrls,
  resolveAudioUrls,
  resolveReferences,
} from "./flashcardDerived";
import { resolveSideBlocks } from "./flashcardBlocks";
import type { CardBlock } from "@/types";

export interface FlashcardDerived {
  cardId: string | null;
  hasUncertainty: boolean;
  isBookmarked: boolean;
  layoutRows: number;
  activeSide: "question" | "answer";
  activeImages: string[];
  activeAudioUrls: string[];
  activeReferences: ReturnType<typeof resolveReferences>;
  activeBlocks: ReturnType<typeof resolveSideBlocks>;
  activeInkDocument: ReturnType<typeof resolveInkDocument>;
}

export function useFlashcardDerived(
  cardData: FlashcardCardLike | null | undefined,
  effectiveIsFlipped: boolean,
): FlashcardDerived {
  const cardId = cardData ? resolveCardId(cardData) : null;

  const hasUncertainty = cardData ? resolveHasUncertainty(cardData) : false;
  const isBookmarked = cardData ? resolveIsBookmarked(cardData) : false;
  const layoutRows = cardData ? resolveLayoutRows(cardData) : 0;

  const questionText = cardData ? resolveQuestionText(cardData) : "";
  const answerText = cardData ? resolveAnswerText(cardData) : "";

  const questionCode = cardData ? resolveQuestionCode(cardData) : null;
  const answerCode = cardData ? resolveAnswerCode(cardData) : null;

   
  const questionImageUrls = React.useMemo(
    () => resolveImageUrls(cardData ? resolveQuestionImages(cardData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData?.question_images, cardData?.questionImages],
  );
   
  const answerImageUrls = React.useMemo(
    () => resolveImageUrls(cardData ? resolveAnswerImages(cardData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData?.answer_images, cardData?.answerImages],
  );

  const questionAudios = React.useMemo(
    () => (cardData ? resolveQuestionAudios(cardData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData?.question_audios, cardData?.questionAudios],
  );
  const answerAudios = React.useMemo(
    () => (cardData ? resolveAnswerAudios(cardData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData?.answer_audios, cardData?.answerAudios],
  );

  const questionAudioUrls = React.useMemo(
    () => resolveAudioUrls(questionAudios),
    [questionAudios],
  );
  const answerAudioUrls = React.useMemo(
    () => resolveAudioUrls(answerAudios),
    [answerAudios],
  );

  const questionReferences = React.useMemo(
    () => resolveReferences((cardData?.questionBlocks ?? []) as CardBlock[]),
    [cardData?.questionBlocks],
  );
  const answerReferences = React.useMemo(
    () => resolveReferences((cardData?.answerBlocks ?? []) as CardBlock[]),
    [cardData?.answerBlocks],
  );

  const questionInkDocument = React.useMemo(
    () => resolveInkDocument(cardId, "question", cardData?.inkQuestion ?? null),
    [cardData?.inkQuestion, cardId],
  );
  const answerInkDocument = React.useMemo(
    () => resolveInkDocument(cardId, "answer", cardData?.inkAnswer ?? null),
    [cardData?.inkAnswer, cardId],
  );

  // ---------------------------------------------------------------------------
  // Active-side selection（effectiveIsFlipped に依存する処理を一箇所に集約）
  // ---------------------------------------------------------------------------
  const activeSide: "question" | "answer" = effectiveIsFlipped
    ? "answer"
    : "question";
  const activeImages = effectiveIsFlipped ? answerImageUrls : questionImageUrls;
  const activeAudioUrls = effectiveIsFlipped
    ? answerAudioUrls
    : questionAudioUrls;
  const activeReferences = effectiveIsFlipped
    ? answerReferences
    : questionReferences;
  const activeInkDocument = effectiveIsFlipped
    ? answerInkDocument
    : questionInkDocument;

  const activeBlocks = React.useMemo(
    () =>
      resolveSideBlocks(activeSide, {
        blocks:
          activeSide === "question"
            ? ((cardData?.questionBlocks ?? []) as CardBlock[])
            : ((cardData?.answerBlocks ?? []) as CardBlock[]),
        text: activeSide === "question" ? questionText : answerText,
        imageUrls: activeSide === "question" ? questionImageUrls : answerImageUrls,
        audios: activeSide === "question" ? questionAudios : answerAudios,
        code: activeSide === "question" ? questionCode : answerCode,
      }),
    [
      activeSide,
      cardData?.questionBlocks,
      cardData?.answerBlocks,
      questionText,
      answerText,
      questionImageUrls,
      answerImageUrls,
      questionAudios,
      answerAudios,
      questionCode,
      answerCode,
    ],
  );

  return {
    cardId,
    hasUncertainty,
    isBookmarked,
    layoutRows,
    activeSide,
    activeImages,
    activeAudioUrls,
    activeReferences,
    activeBlocks,
    activeInkDocument,
  };
}




