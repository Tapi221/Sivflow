import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

import { useCardSetViewCardLayoutMode } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewCardLayoutMode";
import { useCardSetViewDisplayMode } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewDisplayMode";
import { useCardSetViewEditingBridge } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewEditingBridge";
import { useCardSetViewMetaPanelState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewMetaPanelState";
import { useCardSetViewSelectionState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewSelectionState";
import { useCardSetViewSyncState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewSyncState";

interface UseCardSetViewViewStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  legacyFolderId: string | null;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  selectedCardSet: CardSet | null;
  deviceScope: string;
}

export const useCardSetViewViewState = ({
  initialIndex,
  targetCardId,
  legacyFolderId,
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
    legacyFolderId,
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

  const syncState = useCardSetViewSyncState({
    currentCardId: selectionState.currentCardId,
    isGlobalEditing: selectionState.isGlobalEditing,
    sourceKey: selectionState.sourceKey,
  });

  return {
    ...selectionState,
    ...metaPanelState,
    ...displayModeState,
    ...cardLayoutModeState,
    ...syncState,
  };
};
