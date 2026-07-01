import { useMemo } from "react";
import { buildCardSetById, filterCardsByFolderId, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import type { Card, CardSet, Folder, UserSettings } from "@/types";
import { normalizeDate } from "@/utils/codec/date";



type StudyCard = Card;
type Params = {
  folderId: string | null;
  allCards: StudyCard[];
  cardSets: CardSet[];
  folders: Folder[];
  foldersLoading: boolean;
  settings: Partial<UserSettings> | null | undefined;
};



const useStudyCards = ({ folderId, allCards, cardSets, folders, foldersLoading, settings }: Params) => {
  const cardSetById = useMemo(() => buildCardSetById(cardSets.filter((cardSet) => !cardSet.isDeleted)), [cardSets]);

  const studyCards = useMemo(() => {
    let cards = (allCards ?? []).filter(
      (card) => !card.isDraft && !card.isDeleted,
    );

    if (!foldersLoading) {
      const activeFolderIds = new Set(
        (folders ?? [])
          .filter((folder) => !folder.isDeleted)
          .map((folder) => folder.id)
          .filter(Boolean),
      );
      cards = cards.filter((card) => {
        const resolvedFolderId = resolveCardFolderIdStrict(card, cardSetById);
        return Boolean(
          resolvedFolderId && activeFolderIds.has(resolvedFolderId),
        );
      });
    }

    if (folderId) {
      cards = filterCardsByFolderId(cards, folderId, cardSetById);
    } else {
      const today = new Date();
      const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const autoCarryOver = settings?.autoCarryOver ?? true;
      cards = cards.filter((card) => {
        const reviewDate = normalizeDate(card.nextReviewDate);
        if (!reviewDate) return false;

        const normalizedReviewDate = new Date(
          reviewDate.getFullYear(),
          reviewDate.getMonth(),
          reviewDate.getDate(),
        );

        return autoCarryOver
          ? normalizedReviewDate <= todayDate
          : normalizedReviewDate.getTime() === todayDate.getTime();
      });
    }

    return cards.sort(
      (left, right) => (left.orderIndex || 0) - (right.orderIndex || 0),
    );
  }, [allCards, folderId, folders, foldersLoading, settings, cardSetById]);

  const cardById = useMemo(() => {
    const map = new Map<string, StudyCard>();
    for (const card of studyCards) {
      map.set(card.id, card);
    }
    return map;
  }, [studyCards]);

  return {
    studyCards,
    cardById,
    isEmpty: studyCards.length === 0,
  };
};



export { useStudyCards };
