import type { SelectedExplorerItem } from "@/types";

type Params = {
  baseSearchParams: URLSearchParams;
  isHomeOnlyMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
};

export const mapExplorerSelectionToSearchParams = ({
  baseSearchParams,
  isHomeOnlyMode,
  selectedFolderId,
  selectedItem,
}: Params): URLSearchParams => {
  const next = new URLSearchParams(baseSearchParams.toString());

  if (isHomeOnlyMode) {
    next.set("home", "1");
    next.delete("folderId");
    next.delete("cardId");
    next.delete("docId");
    return next;
  }

  next.delete("home");

  if (selectedFolderId) {
    next.set("folderId", selectedFolderId);
  } else {
    next.delete("folderId");
  }

  if (selectedItem?.type === "card") {
    next.set("cardId", selectedItem.id);
    next.delete("docId");
  } else if (selectedItem?.type === "document") {
    next.set("docId", selectedItem.id);
    next.delete("cardId");
  } else {
    next.delete("cardId");
    next.delete("docId");
  }

  return next;
};
