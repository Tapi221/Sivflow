import { useMemo } from "react";
import type { Card, Folder, UserSettings } from "@/types";

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
    const toDate = (value: unknown): Date | null => {
      if (!value) return null;
      if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
      if (typeof value?.toDate === "function") {
        const d = value.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      }
      if (typeof value === "object") {
        const seconds =
          typeof value.seconds === "number"
            ? value.seconds
            : typeof value._seconds === "number"
              ? value._seconds
              : null;
        const nanoseconds =
          typeof value.nanoseconds === "number"
            ? value.nanoseconds
            : typeof value._nanoseconds === "number"
              ? value._nanoseconds
              : 0;
        if (seconds !== null) {
          const d = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
          return Number.isNaN(d.getTime()) ? null : d;
        }
      }
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

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
      const tDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const autoCarryOver = settings?.autoCarryOver ?? true;
      cards = cards.filter((card) => {
        const reviewDate = toDate(card.nextReviewDate);
        if (!reviewDate) return false;
        const rDate = new Date(
          reviewDate.getFullYear(),
          reviewDate.getMonth(),
          reviewDate.getDate(),
        );
        return autoCarryOver
          ? rDate <= tDate
          : rDate.getTime() === tDate.getTime();
      });
    }

    return cards.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
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
