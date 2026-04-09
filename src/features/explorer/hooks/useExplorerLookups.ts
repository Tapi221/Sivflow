import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { useMemo } from "react";
import { buildExplorerLookups } from "../services/buildExplorerLookups";
import { buildExplorerSelectedState } from "../services/buildExplorerSelectedState";
import { normalizeFolders } from "../services/normalizeFolders";

type UseExplorerLookupsParams = {
  folders: Folder[];
  cards: Card[];
  documents: DocumentItem[];
  selectedItem: SelectedExplorerItem;
};

export const useExplorerLookups = ({
  folders,
  cards,
  documents,
  selectedItem,
}: UseExplorerLookupsParams) => {
  const normalizedFolders = useMemo(() => normalizeFolders(folders), [folders]);

  const { folderById, cardById, documentById } = useMemo(
    () =>
      buildExplorerLookups({
        folders: normalizedFolders,
        cards,
        documents,
      }),
    [cards, documents, normalizedFolders],
  );

  const { selectedCardId, selectedDocumentId } = useMemo(
    () => buildExplorerSelectedState(selectedItem),
    [selectedItem],
  );

  return {
    normalizedFolders,
    folderById,
    cardById,
    documentById,
    selectedCardId,
    selectedDocumentId,
  };
};
