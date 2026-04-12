import { useMemo } from "react";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { buildExplorerSelectedState } from "@/features/explorer/services/buildExplorerSelectedState";
import {
  buildCardById,
  buildDocumentById,
  buildFolderById,
} from "@/features/explorer/services/buildExplorerLookups";
import { normalizeFolders } from "@/features/explorer/services/normalizeFolders";

type Params = {
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
}: Params) => {
  const normalizedFolders = useMemo(() => normalizeFolders(folders), [folders]);

  const folderById = useMemo(
    () => buildFolderById(normalizedFolders),
    [normalizedFolders],
  );

  const cardById = useMemo(() => buildCardById(cards), [cards]);

  const documentById = useMemo(() => buildDocumentById(documents), [documents]);

  const selectedState = useMemo(
    () => buildExplorerSelectedState(selectedItem),
    [selectedItem],
  );

  return {
    normalizedFolders,
    folderById,
    cardById,
    documentById,
    ...selectedState,
  };
};
