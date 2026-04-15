import { useMemo } from "react";
import type { Card, Folder, UserSettings } from "@/types";
import { normalizeDate } from "@/shared/codec/date";

type StudyCard = Card;

type Params = {
  folderId: string | null;
  allCards: StudyCard[];
  folders: Folder[];
  foldersLoading: boolean;
  settings: Partial<UserSettings> | null | undefined;
};

export const useStudyCards = ({
  folderId,
  allCards,
  folders,
  foldersLoading,
  settings,
}: Params) => {
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
        return !card.folderId || activeFolderIds.has(card.folderId);
      });
    }

    if (folderId) {
      cards = cards.filter((card) => card.folderId === folderId);
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
  }, [allCards, folderId, folders, foldersLoading, settings]);

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
