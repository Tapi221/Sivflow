import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeCardFolderId } from "@/domain/card/normalizers/cardShape";
import {
  buildCardSetById,
  filterCardsByFolderId,
} from "@/domain/card/selectors/cardFolder";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";
import { toMillis } from "@/utils/toMillis";

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

type UseCardsReadOptions = {
  enabled?: boolean;
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
  cardSetById: Map<string, Pick<CardSet, "id" | "folderId">>;
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
  const { currentUser } = useAuthSession();
  const [error] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;

  const rawCards = useLiveQuery(async () => {
    try {
      if (!enabled) return [];
      if (!currentUser) return [];

      const db = await getLocalDb(currentUser.uid);

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
            await db.cardSets.where("userId").equals(currentUser.uid).toArray()
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
  }, [currentUser?.uid, folderId, cardSetId, enabled]);

  const shouldReadCardSets = enabled && !cardSetId && Boolean(folderId);

  const rawCardSets = useLiveQuery(
    async () => {
      if (!shouldReadCardSets) return [];
      if (!currentUser) return [];

      const db = await getLocalDb(currentUser.uid);
      return await db.cardSets
        .where("userId")
        .equals(currentUser.uid)
        .toArray();
    },
    [currentUser?.uid, shouldReadCardSets],
    [],
  );

  const cardSetById = useMemo(() => {
    if (!shouldReadCardSets) {
      return new Map<string, Pick<CardSet, "id" | "folderId">>();
    }

    const activeSets = (rawCardSets ?? []).filter((set) => !set.isDeleted);
    return buildCardSetById(activeSets);
  }, [rawCardSets, shouldReadCardSets]);

  const cards = useMemo(() => {
    if (!rawCards || rawCards.length === 0) {
      return [];
    }

    return resolveVisibleCards({
      rawCards,
      folderId,
      cardSetId,
      cardSetById,
    });
  }, [cardSetById, cardSetId, folderId, rawCards]);

  const loading = enabled && rawCards === undefined;

  return {
    cards,
    loading,
    error,
  };
};

export type { UseCardsReadOptions };
