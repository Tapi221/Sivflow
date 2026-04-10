import type { SelectedExplorerItem } from "@/types";

export const getSelectedDocumentId = (
  selectedItem: SelectedExplorerItem,
): string | null =>
  selectedItem?.type === "document" ? selectedItem.id : null;
