import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

import { useCardSetViewCardLayoutMode } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewCardLayoutMode";
import { useCardSetViewDisplayMode } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewDisplayMode";
import { useCardSetViewEditingBridge } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewEditingBridge";
import { useCardSetViewMetaPanelState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewMetaPanelState";
import { useCardSetViewSelectionState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewSelectionState";

interface UseCardSetViewViewStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  selectedCardSet: CardSet | null;
  deviceScope: string;
}

export const useCardSetViewViewState = ({
  initialIndex,
  targetCardId,
  cardSetId,
  sortedCards,
  cardIndexById,
  selectedCardSet,
  deviceScope,
}: UseCardSetViewViewStateOptions) => {
  const selectionState = useCardSetViewSelectionState({
    initialIndex,
    targetCardId,
    deviceScope,
    cardSetId,
    sortedCards,
    cardIndexById,
  });

  const metaPanelState = useCardSetViewMetaPanelState();

  const displayModeState = useCardSetViewDisplayMode({
    cardSetId,
    defaultDisplayMode: selectedCardSet?.defaultDisplayMode,
  });

  const interactionMode = selectionState.isGlobalEditing ? "edit" : "view";

  const cardLayoutModeState = useCardSetViewCardLayoutMode({
    deviceScope,
    cardSetId,
    displayMode: displayModeState.currentDisplayMode,
    interactionMode,
  });

  useCardSetViewEditingBridge(selectionState.isGlobalEditing);

  return {
    ...selectionState,
    ...metaPanelState,
    ...displayModeState,
    ...cardLayoutModeState,
  };
};
