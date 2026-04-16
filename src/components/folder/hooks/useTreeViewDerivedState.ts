import {
  type Card,
  type CardSet,
  type DocumentItem,
  type Folder,
  type SelectedExplorerItem,
} from "@/types";
import { normalizeDate } from "@/shared/codec/date";
import { useCallback, useMemo } from "react";
import {
  buildCardSetById,
  isCardInFolder,
} from "@/domain/card/selectors/cardFolder";

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

export const useTreeViewDerivedState = ({
  folders,
  cards,
  cardSets = [],
  documents,
  selectedFolderId,
  selectedItem,
  selectedCardId,
  selectedDocumentId,
  autoCarryOver = true,
  isMobile,
}: UseTreeViewDerivedStateParams) => {
  const getFolderPath = useCallback(
    (folderId: string | null): string => {
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

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return (
      documents.find(
        (document) =>
          (document.id || document.documentId) === selectedDocumentId,
      ) ?? null
    );
  }, [documents, selectedDocumentId]);

  const mobileDetailTitle = useMemo(() => {
    if (selectedItem?.type === "directory") return "ディレクトリ";
    if (selectedItem?.type === "gallery") return "ギャラリー";
    if (selectedItem?.type === "calendar") return "学習予定";
    if (selectedItem?.type === "settings") return "設定";
    if (selectedItem?.type === "trash") return "ごみ箱";
    if (selectedItem?.type === "card") return "カード";
    if (selectedItem?.type === "document") return "ドキュメント";
    return selectedFolder?.folderName ?? "フォルダ";
  }, [selectedItem, selectedFolder]);

  const folderCards = useMemo(() => {
    if (!selectedFolderId) return [];
    const cardSetById = buildCardSetById(
      cardSets.filter((cardSet) => !cardSet.isDeleted),
    );
    return cards.filter((card) => {
      if (!isCardInFolder(card, selectedFolderId, cardSetById)) return false;
      const isDeleted = card.isDeleted ?? card.isDeleted;
      return !isDeleted;
    });
  }, [cards, selectedFolderId, cardSets]);

  const folderStats = useMemo(() => {
    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    let dueCount = 0;
    let unlearnedCount = 0;
    let lastReviewedAt: Date | null = null;

    for (const card of folderCards) {
      const isDraft = card.isDraft ?? card.isDraft;

      if (!isDraft) {
        const reviewDate = normalizeDate(
          card.nextReviewDate ?? card.nextReviewDate,
        );
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
            dueCount += 1;
          }
        }
      }

      const reviewCount = card.reviewCount ?? card.reviewCount ?? 0;
      if (!isDraft && reviewCount === 0) {
        unlearnedCount += 1;
      }

      const lastReview = normalizeDate(card.lastReviewAt ?? card.lastReviewAt);
      if (lastReview && (!lastReviewedAt || lastReview > lastReviewedAt)) {
        lastReviewedAt = lastReview;
      }
    }

    return {
      dueCount,
      unlearnedCount,
      lastReviewedAt,
    };
  }, [autoCarryOver, folderCards]);

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
