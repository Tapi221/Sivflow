import { getCardText } from "@/domain/card/content";
import type { BreadcrumbCrumb, ExplorerBreadcrumbContext } from "./breadcrumbs.types";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";



type FolderLike = Pick<Folder, "id" | "folderName" | "parentFolderId">;



const areBreadcrumbCrumbsEqual = (a: BreadcrumbCrumb[], b: BreadcrumbCrumb[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  return a.every((crumb, index) => {
    const other = b[index];
    return (
      crumb.label === other.label &&
      crumb.to === other.to &&
      crumb.folderId === other.folderId
    );
  });
};
const buildFolderPathCrumbs = ({ folderId, folderById }: { folderId: string | null | undefined;
  folderById: Map<string, FolderLike>;
}): BreadcrumbCrumb[] => {
  if (!folderId) {
    return [];
  }

  const path: FolderLike[] = [];
  let currentFolder = folderById.get(folderId) ?? null;

  while (currentFolder) {
    path.unshift(currentFolder);
    currentFolder = currentFolder.parentFolderId
      ? (folderById.get(currentFolder.parentFolderId) ?? null)
      : null;
  }

  return path.map((folder) => ({
    label: folder.folderName,
    to: `/library?folderId=${folder.id}`,
    folderId: folder.id,
  }));
};
const buildExplorerBreadcrumbs = ({ selectedFolderId, explorerBreadcrumbContext, selectedItem, folderById, cardById, documentById }: { selectedFolderId: string | null;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
  selectedItem: SelectedExplorerItem;
  folderById: Map<string, FolderLike>;
  cardById: Map<string, Card>;
  documentById: Map<string, DocumentItem>;
}): BreadcrumbCrumb[] => {
  const breadcrumbFolderId =
    selectedFolderId ?? explorerBreadcrumbContext.folderId ?? null;

  const crumbs = buildFolderPathCrumbs({
    folderId: breadcrumbFolderId,
    folderById,
  });

  if (selectedItem?.type === "card") {
    const card = cardById.get(selectedItem.id);
    if (card) {
      const label =
        (card.title?.trim() ||
        getCardText(card, "question").trim().slice(0, 20)) ??
        "カード";
      crumbs.push({ label });
    }
  } else if (selectedItem?.type === "document") {
    const documentItem = documentById.get(selectedItem.id);
    if (documentItem) {
      crumbs.push({
        label: (documentItem.title || documentItem.fileName) ?? "ドキュメント",
      });
    }
  }

  if (explorerBreadcrumbContext.cardSet?.label) {
    crumbs.push({ label: explorerBreadcrumbContext.cardSet.label });
  }

  return crumbs;
};
const buildCardSetViewBreadcrumbs = ({ folderId, selectedCardSet, selectedCard, sortedCards, folderById }: { folderId: string | null;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  sortedCards: Card[];
  folderById: Map<string, FolderLike>;
}): BreadcrumbCrumb[] => {
  const crumbFolderId = folderId ?? selectedCardSet?.folderId ?? null;
  const crumbs = buildFolderPathCrumbs({
    folderId: crumbFolderId,
    folderById,
  });

  if (selectedCardSet) {
    const searchParams = new URLSearchParams();
    if (crumbFolderId) {
      searchParams.set("folderId", crumbFolderId);
    }
    searchParams.set("cardSetId", selectedCardSet.id);

    crumbs.push({
      label: selectedCardSet.name ?? "カードセット",
      to: `/library?${searchParams.toString()}`,
      folderId: crumbFolderId,
    });
  }

  if (selectedCard) {
    const title = selectedCard.title?.trim() ?? "";
    const cardIndex = sortedCards.findIndex(
      (card) => card.id === selectedCard.id,
    );
    const current = cardIndex >= 0 ? cardIndex + 1 : 1;
    const total = Math.max(1, sortedCards.length);
    const label = title
      ? `${current}/${total} : ${title}`
      : `${current}/${total}`;
    crumbs.push({ label });
  }

  return crumbs;
};



export { areBreadcrumbCrumbsEqual, buildFolderPathCrumbs, buildExplorerBreadcrumbs, buildCardSetViewBreadcrumbs };
