import type { Card } from "@/types/domain/card";
import { normalizeMemoryStability } from "./reviewUtils";

/**
 * Determines if a card has been reviewed by the user.
 *
 * @param card - The card to check.
 * @returns True if the card has been reviewed, false otherwise.
 *
 * @remarks
 * **Definition of "Reviewed":**
 * A card is considered reviewed ONLY if `reviewCount > 0`.
 * This means the user has explicitly performed a review action at least once.
 *
 * **Important Notes:**
 * - `memoryStability` is NOT used for this check, as it may be initialized to a non-zero value (e.g., 0.3) in some contexts or future features (AI generation).
 * - `lastReviewAt` is NOT used for this check, as it may be set during import or migration without an actual review taking place.
 * - This strict definition prevents unreviewed cards from polluting statistics with default values.
 */
export const isReviewed = (card: Partial<Card>): boolean => {
  return (card.reviewCount ?? 0) > 0;
};

/**
 * Calculates the average stability of a set of cards.
 *
 * @param cards - Array of cards to calculate average from.
 * @returns The average stability (0-1) of reviewed cards, or `null` if no reviewed cards exist.
 */
export const calculateAverageStability = (
  cards: Partial<Card>[],
): number | null => {
  const getLegacyNumeric = (
    card: Partial<Card>,
    ...keys: string[]
  ): number | undefined => {
    const rec = card as Record<string, unknown>;
    for (const key of keys) {
      const value = rec[key];
      if (typeof value === "number") return value;
    }
    return undefined;
  };
  const reviewedCards = cards.filter(isReviewed);

  if (reviewedCards.length === 0) {
    return null;
  }

  const totalStability = reviewedCards.reduce((sum, c) => {
    const stability = normalizeMemoryStability(
      c.memoryStability ?? getLegacyNumeric(c, "memory_stability"),
      c.currentLevel ?? getLegacyNumeric(c, "current_level", "level"),
    );
    return sum + stability;
  }, 0);

  return totalStability / reviewedCards.length;
};




