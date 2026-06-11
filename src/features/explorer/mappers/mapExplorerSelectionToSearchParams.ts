import type { SelectedExplorerItem } from "@/types";



type Params = {
  isHomeOnlyMode: boolean;
  isSectionListMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
};



const mapExplorerSelectionToSearchParams = ({ isHomeOnlyMode, isSectionListMode, selectedFolderId, selectedItem }: Params): URLSearchParams => {
  const next = new URLSearchParams();

  if (isHomeOnlyMode) {
    next.set("home", "1");
    return next;
  }

  if (isSectionListMode) {
    next.set("view", "section-list");
    return next;
  }

  if (selectedFolderId) {
    next.set("folderId", selectedFolderId);
  }

  if (selectedItem?.type === "card") {
    next.set("cardId", selectedItem.id);
  } else if (selectedItem?.type === "cardSet") {
    next.set("cardSetId", selectedItem.id);
  } else if (selectedItem?.type === "document") {
    next.set("docId", selectedItem.id);
  }

  return next;
};



export { mapExplorerSelectionToSearchParams };
