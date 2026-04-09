import type { SelectedExplorerItem } from "../contracts/explorerSelection";

export const buildExplorerSelectedState = (selectedItem: SelectedExplorerItem) => {
  return {
    selectedCardId: selectedItem?.type === "card" ? selectedItem.id : null,
    selectedDocumentId: selectedItem?.type === "document" ? selectedItem.id : null,
  };
};
