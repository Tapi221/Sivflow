import type { SelectedExplorerItem } from "../contracts/explorerSelection";

type Params = {
  base: URLSearchParams;
  selectedFolderId: string | null;
  selectedItem: unknown;
};

export const mapExplorerSelectionToSearchParams = ({
  base,
  selectedFolderId,
  selectedItem,
}: Params) => {
  const next = new URLSearchParams(base.toString());
  const typedSelectedItem = selectedItem as SelectedExplorerItem;

  if (selectedFolderId || typedSelectedItem) {
    next.delete("home");
  }

  if (selectedFolderId) {
    next.set("folderId", selectedFolderId);
  } else {
    next.delete("folderId");
  }

  if (typedSelectedItem?.type === "card") {
    next.set("cardId", typedSelectedItem.id);
    next.delete("docId");
  } else if (typedSelectedItem?.type === "document") {
    next.set("docId", typedSelectedItem.id);
    next.delete("cardId");
  } else {
    next.delete("cardId");
    next.delete("docId");
  }

  return next;
};
