import { useCallback, useMemo } from "react";
import { buildCardSetById, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import type { Card, CardSet, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { normalizeDate } from "@/utils/codec/date";



interface UseTreeViewDerivedStateParams {
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocumentId: string | null;
  autoCarryOver?: boolean;
  isMobile: boolean;
}
type FolderStats = {
  dueCount: number;
  unlearnedCount: number;
  lastReviewedAt: Date | null;
};



const EMPTY_FOLDER_STATS: FolderStats = {
  dueCount: 0,
  unlearnedCount: 0,
  lastReviewedAt: null,
};



const createEmptyFolderStats = (): FolderStats => ({
  dueCount: 0,
  unlearnedCount: 0,
  lastReviewedAt: null,
});
const useTreeViewDerivedState = ({ folders, cards, cardSets = [], documents, selectedFolderId, selectedItem, selectedCardId, selectedDocumentId, autoCarryOver = true, isMobile }: UseTreeViewDerivedStateParams) => {
  const getFolderPath = useCallback((folderId: string | null): string => {
    if (!folderId) return "";

    const path: string[] = [];
    let currentFolder = folders.find((folder) => folder.id === folderId);

    while (currentFolder) {
      path.unshift(currentFolder.folderName);

      const parentFolderId = currentFolder.parentFolderId;
      currentFolder = folders.find((folder) => folder.id === parentFolderId);
    }

    return path.join(" / ");
  },
  [folders],
  );

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((folder) => folder.id === selectedFolderId) ?? null;
  }, [folders, selectedFolderId]);

  const documentById = useMemo(() => {
    const nextMap = new Map<string, DocumentItem>();

    documents.forEach((document) => {
      nextMap.set(document.id, document);
      if (
        typeof document.documentId === "string" &&
        document.documentId.length > 0
      ) {
        nextMap.set(document.documentId, document);
      }
    });

    return nextMap;
  }, [documents]);

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return documentById.get(selectedDocumentId) ?? null;
  }, [documentById, selectedDocumentId]);

  const mobileDetailTitle = useMemo(() => {
    if (selectedItem?.type === "gallery") return "ギャラリー";
    if (selectedItem?.type === "calendar") return "学習予定";
    if (selectedItem?.type === "settings") return "設定";
    if (selectedItem?.type === "trash") return "ごみ箱";
    if (selectedItem?.type === "card") return "カード";
    if (selectedItem?.type === "document") return "ドキュメント";
    return selectedFolder?.folderName ?? "フォルダ";
  }, [selectedItem, selectedFolder]);

  const activeCardSets = useMemo(
    () => cardSets.filter((cardSet) => !cardSet.isDeleted),
    [cardSets],
  );

  const cardSetById = useMemo(
    () => buildCardSetById(activeCardSets),
    [activeCardSets],
  );

  const shouldBuildFolderCardIndex = selectedItem?.type !== "cardSet";

  const folderCardIndex = useMemo(() => {
    const cardsByFolderId = new Map<string, Card[]>();
    const statsByFolderId = new Map<string, FolderStats>();

    if (!shouldBuildFolderCardIndex) {
      return {
        cardsByFolderId,
        statsByFolderId,
      };
    }

    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    cards.forEach((card) => {
      if (card.isDeleted) {
        return;
      }

      const resolvedFolderId = resolveCardFolderIdStrict(card, cardSetById);
      if (!resolvedFolderId) {
        return;
      }

      const nextFolderCards = cardsByFolderId.get(resolvedFolderId) ?? [];
      nextFolderCards.push(card);
      cardsByFolderId.set(resolvedFolderId, nextFolderCards);

      const nextFolderStats =
        statsByFolderId.get(resolvedFolderId) ?? createEmptyFolderStats();

      const isDraft = Boolean(card.isDraft);

      if (!isDraft) {
        const reviewDate = normalizeDate(card.nextReviewDate);
        if (reviewDate) {
          const normalizedReviewDate = new Date(
            reviewDate.getFullYear(),
            reviewDate.getMonth(),
            reviewDate.getDate(),
          );
          if (
            autoCarryOver
              ? normalizedReviewDate <= todayDate
              : normalizedReviewDate.getTime() === todayDate.getTime()
          ) {
            nextFolderStats.dueCount += 1;
          }
        }
      }

      const reviewCount = card.reviewCount ?? 0;
      if (!isDraft && reviewCount === 0) {
        nextFolderStats.unlearnedCount += 1;
      }

      const lastReview = normalizeDate(card.lastReviewAt);
      if (
        lastReview &&
        (!nextFolderStats.lastReviewedAt ||
          lastReview > nextFolderStats.lastReviewedAt)
      ) {
        nextFolderStats.lastReviewedAt = lastReview;
      }

      statsByFolderId.set(resolvedFolderId, nextFolderStats);
    });

    return {
      cardsByFolderId,
      statsByFolderId,
    };
  }, [autoCarryOver, cardSetById, cards, shouldBuildFolderCardIndex]);

  const folderCards = useMemo(() => {
    if (!selectedFolderId) return [];
    return folderCardIndex.cardsByFolderId.get(selectedFolderId) ?? [];
  }, [folderCardIndex.cardsByFolderId, selectedFolderId]);

  const folderStats = useMemo(() => {
    if (!selectedFolderId) return EMPTY_FOLDER_STATS;
    return (
      folderCardIndex.statsByFolderId.get(selectedFolderId) ??
      EMPTY_FOLDER_STATS
    );
  }, [folderCardIndex.statsByFolderId, selectedFolderId]);

  const showMobileDetail =
    isMobile &&
    Boolean(
      selectedFolderId || selectedCardId || selectedDocumentId || selectedItem,
    );

  return {
    getFolderPath,
    selectedFolder,
    selectedDocument,
    mobileDetailTitle,
    folderCards,
    folderStats,
    showMobileDetail,
  };
};



export { useTreeViewDerivedState };
