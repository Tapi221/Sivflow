import type { SelectedExplorerItem } from "@/types";
import { getSelectedCardId } from "@/features/explorer/utils/getSelectedCardId";
import { getSelectedDocumentId } from "@/features/explorer/utils/getSelectedDocumentId";

export const buildExplorerSelectedState = (
  selectedItem: SelectedExplorerItem,
) => ({
  selectedCardId: getSelectedCardId(selectedItem),
  selectedDocumentId: getSelectedDocumentId(selectedItem),
});
