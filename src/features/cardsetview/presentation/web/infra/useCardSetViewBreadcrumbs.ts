import { useEffect, useMemo } from "react";

import { buildCardSetViewBreadcrumbs } from "@/features/breadcrumbs/builders";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

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
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  sortedCards: Card[];
  folders: Folder[];
  setExtraCrumbs: (crumbs: Crumb[]) => void;
}

export const useCardSetViewBreadcrumbs = ({
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

  const resolvedFolderId = selectedCardSet?.folderId ?? null;

  useEffect(() => {
    setExtraCrumbs(
      buildCardSetViewBreadcrumbs({
        folderId: resolvedFolderId,
        selectedCardSet,
        selectedCard,
        sortedCards,
        folderById,
      }),
    );
  }, [
    resolvedFolderId,
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
