import type { SelectedExplorerItem } from "@/types";

type Params = {
  isHomeOnlyMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
};

export const mapExplorerSelectionToSearchParams = ({
  isHomeOnlyMode,
  selectedFolderId,
  selectedItem,
}: Params): URLSearchParams => {
  const next = new URLSearchParams();

  if (isHomeOnlyMode) {
    next.set("home", "1");
    return next;
  }

  if (selectedFolderId) {
    next.set("folderId", selectedFolderId);
  }

  if (selectedItem?.type === "card") {
    next.set("cardId", selectedItem.id);
  } else if (selectedItem?.type === "document") {
    next.set("docId", selectedItem.id);
  }

  return next;
};
