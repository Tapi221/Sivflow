import { useCallback, useEffect, useState } from "react";

import {
  resolveCardSetDisplayMode,
  setCardSetSessionDisplayMode,
} from "@/services/cardDisplayModeSession";
import type { CardDisplayMode } from "@/types/domain/cardSet";

interface UseCardSetViewDisplayModeOptions {
  cardSetId: string | null;
  defaultDisplayMode?: CardDisplayMode | null;
}

export const useCardSetViewDisplayMode = ({
  cardSetId,
  defaultDisplayMode,
}: UseCardSetViewDisplayModeOptions) => {
  const [currentDisplayMode, setCurrentDisplayModeState] =
    useState<CardDisplayMode>(() =>
      resolveCardSetDisplayMode(cardSetId, defaultDisplayMode ?? undefined),
    );

  useEffect(() => {
    setCurrentDisplayModeState(
      resolveCardSetDisplayMode(cardSetId, defaultDisplayMode ?? undefined),
    );
  }, [cardSetId, defaultDisplayMode]);

  const setCurrentDisplayMode = useCallback(
    (mode: CardDisplayMode) => {
      setCardSetSessionDisplayMode(cardSetId, mode);
      setCurrentDisplayModeState(mode);
    },
    [cardSetId],
  );

  return {
    currentDisplayMode,
    setCurrentDisplayMode,
  };
};
