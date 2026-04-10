import type { SelectedExplorerItem } from "@/types";
import { getSelectedCardId } from "../utils/getSelectedCardId";
import { getSelectedDocumentId } from "../utils/getSelectedDocumentId";

export const buildExplorerSelectedState = (
  selectedItem: SelectedExplorerItem,
) => ({
  selectedCardId: getSelectedCardId(selectedItem),
  selectedDocumentId: getSelectedDocumentId(selectedItem),
});
