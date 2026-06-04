import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { normalizeCardFolderId } from "@/domain/card/normalizers/cardShape";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { buildCardSetById, filterCardsByFolderId } from "@/domain/card/selectors/cardFolder";
import { useEffectiveLocalUserId } from "@/hooks/auth/useEffectiveLocalUserId";
import { getLocalDb } from "@/services/localDB";
import type { Card } from "@/types";
import { toMillis } from "@/utils/toMillis";

type UseCardsReadOptions = {
  enabled?: boolean;
};

type CardSetById = ReturnType<typeof buildCardSetById>;

const isCardDeleted = (
  card: Partial<Card> & {
    is_deleted?: boolean;
    deleted?: boolean;
    deletedAt?: unknown;
    deleted_at?: unknown;
  },
) => {
  const deletedAt =
    (card as unknown as { deletedAt?: unknown; deleted_at?: unknown })
      .deletedAt ??
    (card as unknown as { deletedAt?: unknown; deleted_at?: unknown })
      .deleted_at;

  return Boolean(
    card.isDeleted ??
    card.is_deleted ??
    (card as unknown as { deleted?: boolean }).deleted ??
    deletedAt,
  );
};

const normalizeFolderId = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toTime = (value: unknown): number => {
  return toMillis(value);
};

const compareCards = (left: Card, right: Card): number => {
  const leftOrder = left.orderIndex ?? 0;
  const rightOrder = right.orderIndex ?? 0;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  const leftUpdatedAt = toTime(left.updatedAt);
  const rightUpdatedAt = toTime(right.updatedAt);

  if (leftUpdatedAt !== rightUpdatedAt) {
    return leftUpdatedAt - rightUpdatedAt;
  }

  const leftCreatedAt = toTime(left.createdAt);
  const rightCreatedAt = toTime(right.createdAt);

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  return left.id.localeCompare(right.id);
};

const resolveVisibleCards = ({
  rawCards,
  folderId,
  cardSetId,
  cardSetById,
}: {
  rawCards: readonly unknown[];
  folderId?: string;
  cardSetId?: string;
  cardSetById: CardSetById;
}): Card[] => {
  let normalized = rawCards
    .map((rawCard) => normalizeCard(rawCard))
    .filter(
      (card) =>
        !isCardDeleted(card as Partial<Card> & { is_deleted?: boolean }),
    );

  if (cardSetId) {
    normalized = normalized.filter((card) => card.cardSetId === cardSetId);
  } else if (folderId) {
    normalized = filterCardsByFolderId(normalized, folderId, cardSetById);
  }

  normalized.sort(compareCards);

  return normalized;
};

export const useCardsRead = (
  folderId?: string,
  cardSetId?: string,
  options?: UseCardsReadOptions,
) => {
  const userId = useEffectiveLocalUserId();
  const [error] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;

  const rawCards = useLiveQuery(async () => {
    try {
      if (!enabled) return [];
      if (!userId) return undefined;

      const db = await getLocalDb(userId);

      if (cardSetId) {
        try {
          return await db.cards.where("cardSetId").equals(cardSetId).toArray();
        } catch (indexError) {
          console.warn(
            "[useCardsRead] cardSetId index query failed. Falling back to full scan.",
            indexError,
          );
        }
      } else if (folderId) {
        try {
          const targetFolderId = normalizeFolderId(
            normalizeCardFolderId(folderId),
          );
          const siblingSets = (
            await db.cardSets.where("userId").equals(userId).toArray()
          ).filter(
            (set) =>
              !set.isDeleted &&
              normalizeFolderId(set.folderId ?? null) === targetFolderId,
          );
          const siblingSetIds = siblingSets.map((set) => set.id);

          if (siblingSetIds.length === 0) {
            return [];
          }

          return await db.cards
            .where("cardSetId")
            .anyOf(siblingSetIds)
            .toArray();
        } catch (indexError) {
          console.warn(
            "[useCardsRead] folder/cardSet index query failed. Falling back to full scan.",
            indexError,
          );
        }
      }

      return await db.getAllCards();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[useCardsRead] Error: ${message}`);
      return [];
    }
  }, [userId, folderId, cardSetId, enabled]);

  const shouldReadCardSets = enabled && !cardSetId && Boolean(folderId);

  const rawCardSets = useLiveQuery(
    async () => {
      if (!shouldReadCardSets) return [];
      if (!userId) return [];

      const db = await getLocalDb(userId);
      return await db.cardSets
        .where("userId")
        .equals(userId)
        .toArray();
    },
    [userId, shouldReadCardSets],
    [],
  );

  const cardSetById = useMemo((): CardSetById => {
    if (!shouldReadCardSets) {
      return buildCardSetById([]);
    }

    const activeSets = (rawCardSets ?? []).filter((set) => !set.isDeleted);
    return buildCardSetById(activeSets);
  }, [rawCardSets, shouldReadCardSets]);

  const cards = useMemo(() => {
    if (!enabled || !rawCards || rawCards.length === 0) {
      return [];
    }

    return resolveVisibleCards({
      rawCards,
      folderId,
      cardSetId,
      cardSetById,
    });
  }, [cardSetById, cardSetId, enabled, folderId, rawCards]);

  const loading = enabled && rawCards === undefined;

  return {
    cards,
    loading,
    error,
  };
};

export type { UseCardsReadOptions };
