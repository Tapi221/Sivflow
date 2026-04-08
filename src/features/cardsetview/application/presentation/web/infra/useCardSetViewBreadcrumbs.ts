import { buildCardSetViewBreadcrumbs } from "@/features/breadcrumbs/builders";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";
import { useEffect, useMemo } from "react";

interface Folder {
  id: string;
  folderName: string;
  parentFolderId?: string | null;
}

interface Crumb {
  label: string;
  to?: string;
  folderId?: string | null;
}

interface UseCardSetViewBreadcrumbsOptions {
  folderId: string | null;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  sortedCards: Card[];
  folders: Folder[];
  setExtraCrumbs: (crumbs: Crumb[]) => void;
}

export const useCardSetViewBreadcrumbs = ({
  folderId,
  selectedCardSet,
  selectedCard,
  sortedCards,
  folders,
  setExtraCrumbs,
}: UseCardSetViewBreadcrumbsOptions) => {
  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  useEffect(() => {
    setExtraCrumbs(
      buildCardSetViewBreadcrumbs({
        folderId,
        selectedCardSet,
        selectedCard,
        sortedCards,
        folderById,
      }),
    );
  }, [
    folderId,
    selectedCardSet,
    selectedCard,
    sortedCards,
    folderById,
    setExtraCrumbs,
  ]);

  useEffect(() => {
    return () => {
      setExtraCrumbs([]);
    };
  }, [setExtraCrumbs]);
};