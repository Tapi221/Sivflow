import { useMemo } from "react";

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
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
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const isCardDeleted = (card: unknown) =>
  Boolean(
    card?.isDeleted ??
    card?.is_deleted ??
    card?.deleted ??
    card?.deletedAt ??
    card?.deleted_at,
  );

const isCardDraft = (card: unknown) => Boolean(card?.isDraft ?? card?.is_draft);
const isCardSilent = (card: unknown) =>
  Boolean(card?.isSilent ?? card?.is_silent);

type UseReviewCountParams = {
  settings: unknown;
  cards: unknown[];
  cardsLoading: boolean;
  folders: unknown[];
  foldersLoading: boolean;
};

export function useReviewCount({
  settings,
  cards,
  cardsLoading,
  folders,
  foldersLoading,
}: UseReviewCountParams) {
  const folderMap = useMemo(() => {
    const map = new Map<string, any>();
    folders.forEach((folder: unknown) => {
      const id = folder?.id ?? folder?.folderId;
      if (id) map.set(String(id), folder);
    });
    return map;
  }, [folders]);

  const reviewCount = useMemo(() => {
    if (!cards || cardsLoading || foldersLoading) return 0;

    const autoCarryOver = settings?.autoCarryOver ?? true;
    const today = new Date();
    const tDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    return cards.filter((card: unknown) => {
      if (isCardDeleted(card) || isCardDraft(card) || isCardSilent(card))
        return false;

      const dateValue = card?.next_review_date ?? card?.nextReviewDate;
      const reviewDate = toDate(dateValue);
      if (!reviewDate) return false;

      const folderId = card?.folderId ?? card?.folder_id;
      if (folderId !== null && folderId !== undefined && folderId !== "") {
        const normalizedFolderId = String(folderId);
        const folder = folderMap.get(normalizedFolderId);
        if (!folder) return false;
        if (folder?.isDeleted ?? folder?.is_deleted) return false;
      }

      const rDate = new Date(
        reviewDate.getFullYear(),
        reviewDate.getMonth(),
        reviewDate.getDate(),
      );
      if (autoCarryOver) {
        return rDate <= tDate;
      }
      return rDate.getTime() === tDate.getTime();
    }).length;
  }, [cards, cardsLoading, folderMap, foldersLoading, settings?.autoCarryOver]);

  return { reviewCount };
}
