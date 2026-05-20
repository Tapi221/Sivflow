import { useEffect, useMemo } from "react";

import { buildExplorerSearchItems } from "@/features/global-search/lib/buildExplorerSearchItems";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";

import type {
  Card,
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";

type ExplorerSearchSourceBridgeProps = {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
};

export const ExplorerSearchSourceBridge = ({
  folders,
  cards,
  cardSets,
  documents,
  onFolderSelect,
  onItemSelect,
}: ExplorerSearchSourceBridgeProps) => {
  const registerSource = useGlobalSearchStore((state) => state.registerSource);
  const unregisterSource = useGlobalSearchStore(
    (state) => state.unregisterSource,
  );

  const items = useMemo(() => {
    return buildExplorerSearchItems({
      folders,
      cards,
      cardSets,
      documents,
      onFolderSelect,
      onItemSelect,
    });
  }, [folders, cards, cardSets, documents, onFolderSelect, onItemSelect]);

  useEffect(() => {
    registerSource({
      sourceId: "explorer",
      items,
    });

    return () => {
      unregisterSource("explorer");
    };
  }, [items, registerSource, unregisterSource]);

  return null;
};
