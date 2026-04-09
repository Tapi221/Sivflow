import type { SelectedExplorerItem } from "../contracts/explorerSelection";

export const getSelectedDocumentId = (selectedItem: SelectedExplorerItem) => {
  return selectedItem?.type === "document" ? selectedItem.id : null;
};
