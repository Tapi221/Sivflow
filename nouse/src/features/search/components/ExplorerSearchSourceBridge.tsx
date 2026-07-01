import { useEffect, useMemo } from "react";
import { buildExplorerSearchItems } from "@/features/search/lib/buildExplorerSearchItems";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import type { Card, CardSet, DocumentItem, Folder, SelectedExplorerItem } from "@/types";



type ExplorerSearchSourceBridgeProps = {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
};



const ExplorerSearchSourceBridge = ({ folders, cards, cardSets, documents, onFolderSelect, onItemSelect }: ExplorerSearchSourceBridgeProps) => {
  const registerSource = useSearchStore((state) => state.registerSource);
  const unregisterSource = useSearchStore(
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



export { ExplorerSearchSourceBridge };
