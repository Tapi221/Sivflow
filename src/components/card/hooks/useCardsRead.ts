import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocation } from "react-router-dom";
import { useEffectiveLocalUserId } from "@/contexts/auth/useEffectiveLocalUserId";
import { normalizeCardFolderId } from "@/domain/card/normalizers/cardShape";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { buildCardSetById, filterCardsByFolderId } from "@/domain/card/selectors/cardFolder";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { getLocalDb } from "@/services/localdb";
import type { Card } from "@/types";
import { toMillis } from "@/utils/toMillis";



type UseCardsReadOptions = {
  enabled?: boolean;
};
type CardSetById = ReturnType<typeof buildCardSetById>;
type LocalDbInstance = Awaited<ReturnType<typeof getLocalDb>>;
type CardsReadSnapshot = {
  key: string;
  rawCards: unknown[];
};



const buildCardsReadKey = ({ enabled, userId, folderId, cardSetId }: { enabled: boolean; userId: string | null; folderId?: string; cardSetId?: string; }) => {
  return JSON.stringify([enabled, userId, folderId ?? null, cardSetId ?? null]);
};
const isCardDeleted = (
  card: Partial<Card> & {
    is_deleted?: boolean;
    deleted?: boolean;
    deletedAt?: unknown;
    deleted_at?: unknown;
  },
) => {
  const deletedAt =
    (card as unknown as { deletedAt?: unknown; deleted_at?: unknown; })
      .deletedAt ??
    (card as unknown as { deletedAt?: unknown; deleted_at?: unknown; })
      .deleted_at;

  return Boolean(
    card.isDeleted ??
    card.is_deleted ??
    (card as unknown as { deleted?: boolean; }).deleted ??
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
const normalizeCardSetId = (value: unknown): string | null => {
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
const hasCardSetRouteParam = (search: string): boolean => {
  return new URLSearchParams(search).has("cardSetId");
};
const hasMatchingCardSetId = (rawCard: unknown, cardSetId: string): boolean => {
  if (!rawCard || typeof rawCard !== "object") {
    return false;
  }

  const record = rawCard as { cardSetId?: unknown; card_set_id?: unknown; };
  return normalizeCardSetId(record.cardSetId) === cardSetId || normalizeCardSetId(record.card_set_id) === cardSetId;
};
const readRawCardsByCardSetId = async (db: LocalDbInstance, cardSetId: string): Promise<unknown[]> => {
  try {
    const indexedCards = await db.cards.where("cardSetId").equals(cardSetId).toArray();
    if (indexedCards.length > 0) {
      return indexedCards;
    }
  } catch (indexError) {
    console.warn(
      "[useCardsRead] cardSetId index query failed. Falling back to full scan.",
      indexError,
    );
    return await db.getAllCards();
  }

  const allCards = await db.getAllCards();
  return allCards.filter((rawCard) => hasMatchingCardSetId(rawCard, cardSetId));
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
        !isCardDeleted(card as Partial<Card> & { is_deleted?: boolean; }),
    );

  if (cardSetId) {
    normalized = normalized.filter((card) => card.cardSetId === cardSetId);
  } else if (folderId) {
    normalized = filterCardsByFolderId(normalized, folderId, cardSetById);
  }

  normalized.sort(compareCards);

  return normalized;
};
const useCardsRead = (folderId?: string, cardSetId?: string, options?: UseCardsReadOptions) => {
  const { search } = useLocation();
  const userId = useEffectiveLocalUserId();
  const isActiveWorkspaceCardSetSelected = useWorkspaceTabsStore((state) => {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
    return activeTab?.kind === "explorer" && activeTab.explorerState.selectedItem?.type === "cardSet";
  });
  const [error] = useState<string | null>(null);
  const isUnscopedRead = !folderId && !cardSetId;
  const shouldSkipUnscopedRead = isUnscopedRead && (hasCardSetRouteParam(search) || isActiveWorkspaceCardSetSelected);
  const enabled = (options?.enabled ?? true) && !shouldSkipUnscopedRead;
  const readKey = useMemo(() => buildCardsReadKey({ enabled, userId, folderId, cardSetId }), [cardSetId, enabled, folderId, userId]);

  const cardsSnapshot = useLiveQuery(async (): Promise<CardsReadSnapshot | undefined> => {
    try {
      if (!enabled) return { key: readKey, rawCards: [] };
      if (!userId) return undefined;

      const db = await getLocalDb(userId);

      if (cardSetId) {
        return { key: readKey, rawCards: await readRawCardsByCardSetId(db, cardSetId) };
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
            return { key: readKey, rawCards: [] };
          }

          return { key: readKey, rawCards: await db.cards.where("cardSetId").anyOf(siblingSetIds).toArray() };
        } catch (indexError) {
          console.warn(
            "[useCardsRead] folder/cardSet index query failed. Falling back to full scan.",
            indexError,
          );
        }
      }

      return { key: readKey, rawCards: await db.getAllCards() };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[useCardsRead] Error: ${message}`);
      return { key: readKey, rawCards: [] };
    }
  }, [userId, folderId, cardSetId, enabled, readKey]);

  const rawCards = cardsSnapshot?.key === readKey ? cardsSnapshot.rawCards : undefined;
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



export { useCardsRead };


export type { UseCardsReadOptions };
