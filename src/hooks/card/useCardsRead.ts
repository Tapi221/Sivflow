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

const isCardDeleted = (
  card: Partial<Card> & {
    is_deleted?: boolean;
    deleted?: boolean;
    deletedAt?: unknown;
    deleted_at?: unknown;
  },
) => {
  const deletedAt = (card as unknown as { deletedAt?: unknown; deleted_at?: unknown })
    .deletedAt ?? (card as unknown as { deletedAt?: unknown; deleted_at?: unknown }).deleted_at;
  return Boolean(
    card.isDeleted ?? card.is_deleted ?? (card as unknown as { deleted?: boolean }).deleted ?? deletedAt,
  );
};

export type UseCardsReadOptions = {
  enabled?: boolean;
};

export const useCardsRead = (
  folderId?: string,
  cardSetId?: string,
  options?: UseCardsReadOptions,
) => {
  const { currentUser } = useAuthSession();
  const [error] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;

  const normalizeFolderId = (value: string | null | undefined) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const rawCards = useLiveQuery(
    async () => {
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
            if (siblingSetIds.length === 0) return [];
            return await db.cards.where("cardSetId").anyOf(siblingSetIds).toArray();
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
    },
    [currentUser?.uid, folderId, cardSetId, enabled],
  );

  const rawCardSets = useLiveQuery(
    async () => {
      if (!enabled) return [];
      if (!currentUser) return [];
      const db = await getLocalDb(currentUser.uid);
      return await db.cardSets.where("userId").equals(currentUser.uid).toArray();
    },
    [currentUser?.uid, enabled],
    [],
  );

  const cardSetById = useMemo(() => {
    const activeSets = (rawCardSets ?? []).filter((set) => !set.isDeleted);
    return buildCardSetById(activeSets);
  }, [rawCardSets]);

  const cards = useMemo(() => {
    if (!rawCards || rawCards.length === 0) return [];

    let normalized = rawCards.map(normalizeCard);

    normalized = normalized.filter(
      (card) => !isCardDeleted(card as Partial<Card> & { is_deleted?: boolean }),
    );

    if (cardSetId) {
      normalized = normalized.filter((card) => card.cardSetId === cardSetId);
    } else if (folderId) {
      normalized = filterCardsByFolderId(normalized, folderId, cardSetById);
    }

    normalized.sort(
      (left, right) => (left.orderIndex || 0) - (right.orderIndex || 0),
    );

    return normalized;
  }, [rawCards, folderId, cardSetId, cardSetById]);

  const loading = enabled && rawCards === undefined;

  return {
    cards,
    loading,
    error,
  };
};
