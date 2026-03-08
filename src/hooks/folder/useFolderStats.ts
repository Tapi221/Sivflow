import { useMemo } from "react";
import type { Card } from "@/types";
import { useUserSettings } from "@/hooks/settings/useUserSettings";

export interface FolderStats {
  dueCount: number;
  unlearnedCount: number;
  lastReviewedAt: Date | null;
}

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export function useFolderStats(cards: Card[]): FolderStats {
  const { settings } = useUserSettings();

  return useMemo(() => {
    const autoCarryOver = settings?.autoCarryOver ?? true;
    const today = new Date();
    // Reset time components for accurate date comparison
    const tDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    let dueCount = 0;
    let unlearnedCount = 0;
    let lastReviewedAt: Date | null = null;

    for (const card of cards) {
      // Skip deleted cards
      if (card.isDeleted || (card as unknown).is_deleted) continue;

      const isDraft = card.isDraft ?? (card as unknown).is_draft;

      // Calculate due cards
      if (!isDraft) {
        const reviewDate = toDate(
          card.nextReviewDate ?? (card as unknown).next_review_date,
        );
        if (reviewDate) {
          const rDate = new Date(
            reviewDate.getFullYear(),
            reviewDate.getMonth(),
            reviewDate.getDate(),
          );
          if (
            autoCarryOver ? rDate <= tDate : rDate.getTime() === tDate.getTime()
          ) {
            dueCount += 1;
          }
        }
      }

      // Calculate unlearned cards
      const reviewCount = card.reviewCount ?? (card as unknown).review_count ?? 0;
      if (!isDraft && reviewCount === 0) {
        unlearnedCount += 1;
      }

      // Track last review date
      const lastReview = toDate(
        card.lastReviewAt ?? (card as unknown).last_review_at,
      );
      if (lastReview && (!lastReviewedAt || lastReview > lastReviewedAt)) {
        lastReviewedAt = lastReview;
      }
    }

    return {
      dueCount,
      unlearnedCount,
      lastReviewedAt,
    };
  }, [cards, settings?.autoCarryOver]);
}





