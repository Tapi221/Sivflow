import type { SelectedExplorerItem } from "@/types";

export const getSelectedCardId = (
  selectedItem: SelectedExplorerItem,
): string | null =>
  selectedItem?.type === "card" ? selectedItem.id : null;
