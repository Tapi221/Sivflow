import type { SelectedExplorerItem } from "../contracts/explorerSelection";

export const getSelectedCardId = (selectedItem: SelectedExplorerItem) => {
  return selectedItem?.type === "card" ? selectedItem.id : null;
};
