import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

import { useCardSetViewDisplayMode } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewDisplayMode";
import { useCardSetViewEditingBridge } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewEditingBridge";
import { useCardSetViewMetaPanelState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewMetaPanelState";
import { useCardSetViewSelectionState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewSelectionState";
import { useCardSetViewSyncState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewSyncState";

interface UseCardSetViewViewStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  folderId: string | null;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  selectedCardSet: CardSet | null;
}

export const useCardSetViewViewState = ({
  initialIndex,
  targetCardId,
  folderId,
  cardSetId,
  sortedCards,
  cardIndexById,
  selectedCardSet,
}: UseCardSetViewViewStateOptions) => {
  const selectionState = useCardSetViewSelectionState({
    initialIndex,
    targetCardId,
    folderId,
    cardSetId,
    sortedCards,
    cardIndexById,
  });

  const metaPanelState = useCardSetViewMetaPanelState();

  const displayModeState = useCardSetViewDisplayMode({
    cardSetId,
    defaultDisplayMode: selectedCardSet?.defaultDisplayMode,
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
    ...syncState,
  };
};
