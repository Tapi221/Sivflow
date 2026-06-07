import { type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clampCardIndex, createCardSetViewSourceKey, resolveCardIndexById, resolveCardsForPager, toggleFlippedCardId } from "@/features/cardsetview/domain/cardSetViewState";
import { useCardEntity } from "@/components/card/hooks/useCardEntity";
import { getCardSetViewFlippedCardIds, setCardSetViewFlippedCardIds } from "@/services/cardSetViewFlippedFacePreferences";
import type { Card } from "@/types";

type KeyedNumberState = {
  sourceKey: string;
  value: number | null;
};

type KeyedStringState = {
  sourceKey: string;
  value: string | null;
};

type KeyedFlipState = {
  sourceKey: string;
  ids: Set<string>;
};

type CardFace = "question" | "answer";

interface UseCardSetViewSelectionStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  deviceScope: string;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
}

export const useCardSetViewSelectionState = ({
  initialIndex,
  targetCardId,
  device