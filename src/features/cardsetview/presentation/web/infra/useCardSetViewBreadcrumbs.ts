import { useLayoutEffect, useMemo } from "react";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/breadcrumbs.types";
import { buildCardSetViewBreadcrumbs } from "@/features/breadcrumbs/builders";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";



type FolderLike = {
  id: string;
  folderName: string;
  parentFolderId?: string | null;
};
interface UseCardSetViewBreadcrumbsOptions {
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  sortedCards: Card[];
  folders: FolderLike[];
  setExtraCrumbs: (crumbs: BreadcrumbCrumb[]) => void;
}



const useCardSetViewBreadcrumbs = ({ selectedCardSet, selectedCard, sortedCards, folders, setExtraCrumbs }: UseCardSetViewBreadcrumbsOptions) => {
  const folderById = useMemo(() => new Map<string, FolderLike>(folders.map((folder) => [folder.id, folder])), [folders]);

  const resolvedFolderId = selectedCardSet?.folderId ?? null;

  const extraCrumbs = useMemo<BreadcrumbCrumb[]>(
    () =>
      buildCardSetViewBreadcrumbs({
        folderId: resolvedFolderId,
        selectedCardSet,
        selectedCard,
        sortedCards,
        folderById,
      }),
    [folderById, resolvedFolderId, selectedCard, selectedCardSet, sortedCards],
  );

  useLayoutEffect(() => {
    setExtraCrumbs(extraCrumbs);
  }, [extraCrumbs, setExtraCrumbs]);

  useLayoutEffect(() => {
    return () => {
      setExtraCrumbs([]);
    };
  }, [setExtraCrumbs]);
};



export { useCardSetViewBreadcrumbs };
