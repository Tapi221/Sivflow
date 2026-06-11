import { useCallback, useMemo, useState } from "react";
import type { CardLayoutMode, CardSetInteractionMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { buildCardLayoutPreferenceScopeKey, resolveDefaultCardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { resolveCardLayoutModePreference, setCardLayoutModePreference } from "@/services/cardLayoutModePreferences";
import type { CardDisplayMode } from "@/types/domain/cardSet";



interface UseCardSetViewCardLayoutModeOptions {
  deviceScope: string;
  cardSetId: string | null;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
  defaultCardLayoutMode?: CardLayoutMode | null;
}
type CardLayoutModeOverrideState = {
  scopeKey: string;
  mode: CardLayoutMode;
} | null;



const useCardSetViewCardLayoutMode = ({ deviceScope, cardSetId, displayMode, interactionMode, defaultCardLayoutMode }: UseCardSetViewCardLayoutModeOptions) => {
  const scopeKey = useMemo(() => buildCardLayoutPreferenceScopeKey({ deviceScope, cardSetId, displayMode, interactionMode }), [cardSetId, deviceScope, displayMode, interactionMode]);

  const resolvedCardLayoutMode = useMemo(
    () =>
      resolveCardLayoutModePreference(
        {
          deviceScope,
          cardSetId,
          displayMode,
          interactionMode,
        },
        defaultCardLayoutMode ?? resolveDefaultCardLayoutMode(interactionMode),
      ),
    [
      cardSetId,
      defaultCardLayoutMode,
      deviceScope,
      displayMode,
      interactionMode,
    ],
  );

  const [overrideState, setOverrideState] =
    useState<CardLayoutModeOverrideState>(null);

  const currentCardLayoutMode =
    overrideState?.scopeKey === scopeKey
      ? overrideState.mode
      : resolvedCardLayoutMode;

  const setCurrentCardLayoutMode = useCallback(
    (mode: CardLayoutMode) => {
      setCardLayoutModePreference(
        {
          deviceScope,
          cardSetId,
          displayMode,
          interactionMode,
        },
        mode,
      );

      setOverrideState({
        scopeKey,
        mode,
      });
    },
    [cardSetId, deviceScope, displayMode, interactionMode, scopeKey],
  );

  return {
    currentCardLayoutMode,
    setCurrentCardLayoutMode,
  };
};



export { useCardSetViewCardLayoutMode };
