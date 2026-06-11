import { useCardSetViewCardLayoutMode } from "./useCardSetViewCardLayoutMode";
import { useCardSetViewDisplayMode } from "./useCardSetViewDisplayMode";
import { useCardSetViewEditingBridge } from "./useCardSetViewEditingBridge";
import { useCardSetViewSelectionState } from "./useCardSetViewSelectionState";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";



interface UseCardSetViewViewStateOptions {
  initialIndex: number;
  targetCardId: string | null;
  cardSetId: string | null;
  sortedCards: Card[];
  cardIndexById: Map<string, number>;
  selectedCardSet: CardSet | null;
  deviceScope: string;
}



const useCardSetViewViewState = ({ initialIndex, targetCardId, cardSetId, sortedCards, cardIndexById, selectedCardSet, deviceScope }: UseCardSetViewViewStateOptions) => {
  const selectionState = useCardSetViewSelectionState({ initialIndex, targetCardId, deviceScope, cardSetId, sortedCards, cardIndexById });

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
    ...displayModeState,
    ...cardLayoutModeState,
  };
};



export { useCardSetViewViewState };
