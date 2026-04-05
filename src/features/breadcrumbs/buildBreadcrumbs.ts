import { getCardText } from "@/domain/card/content";
import type {
  BreadcrumbCrumb,
  ExplorerBreadcrumbContext,
} from "@/features/breadcrumbs/types";
import type { Card, DocumentItem, Folder } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

const buildFolderPathCrumbs = (
  folderId: string | null | undefined,
  folderById: Map<string, Folder>,
): BreadcrumbCrumb[] => {
  if (!folderId) return [];

  const path: Folder[] = [];
  let current = folderById.get(folderId) ?? null;

  while (current) {
    path.unshift(current);
    current = current.parentFolderId
      ? (folderById.get(current.parentFolderId) ?? null)
      : null;
  }

  return path.map((folder) => ({
    label: folder.folderName,
    to: `/folders?folderId=${folder.id}`,
    folderId: folder.id,
  }));
};

export const buildExplorerExtraCrumbs = ({
  selectedFolderId,
  explorerBreadcrumbContext,
  selectedItem,
  folderById,
  cardById,
  documentById,
}: {
  selectedFolderId: string | null;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
  selectedItem: { type: string; id?: string | undefined } | null | undefined;
  folderById: Map<string, Folder>;
  cardById: Map<string, Card>;
  documentById: Map<string, DocumentItem>;
}): BreadcrumbCrumb[] => {
  const crumbs: BreadcrumbCrumb[] = [];
  const breadcrumbFolderId =
    selectedFolderId ?? explorerBreadcrumbContext.folderId;

  crumbs.push(...buildFolderPathCrumbs(breadcrumbFolderId, folderById));

  if (selectedItem?.type === "card" && selectedItem.id) {
    const card = cardById.get(selectedItem.id);
    if (card) {
      const label =
        card.title?.trim() ||
        getCardText(card, "question").trim().slice(0, 20) ||
        "カード";
      crumbs.push({ label });
    }
  } else if (selectedItem?.type === "document" && selectedItem.id) {
    const doc = documentById.get(selectedItem.id);
    if (doc) {
      crumbs.push({ label: doc.title || doc.fileName || "ドキュメント" });
    }
  }

  if (explorerBreadcrumbContext.cardSet?.label) {
    crumbs.push({ label: explorerBreadcrumbContext.cardSet.label });
  }

  return crumbs;
};

export const buildCardViewExtraCrumbs = ({
  folderId,
  selectedCardSet,
  selectedCard,
  sortedCards,
  folderById,
}: {
  folderId: string | null;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  sortedCards: Card[];
  folderById: Map<string, Folder>;
}): BreadcrumbCrumb[] => {
  const crumbs: BreadcrumbCrumb[] = [];
  const crumbFolderId = folderId ?? selectedCardSet?.folderId ?? null;

  crumbs.push(...buildFolderPathCrumbs(crumbFolderId, folderById));

  if (selectedCardSet) {
    const qs = new URLSearchParams();
    if (crumbFolderId) qs.set("folderId", crumbFolderId);
    qs.set("cardSetId", selectedCardSet.id);

    crumbs.push({
      label: selectedCardSet.name || "カードセット",
      to: `/folders?${qs.toString()}`,
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

export const areBreadcrumbCrumbsEqual = (
  a: BreadcrumbCrumb[],
  b: BreadcrumbCrumb[],
): boolean => {
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

export const isSameExplorerBreadcrumbContext = (
  a: ExplorerBreadcrumbContext,
  b: ExplorerBreadcrumbContext,
): boolean =>
  a.folderId === b.folderId &&
  a.cardSet?.id === b.cardSet?.id &&
  a.cardSet?.label === b.cardSet?.label;
