import { useEffect, useMemo, useRef, useState } from "react";
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

type CachedNormalizedCard = {
  revisionKey: string;
  card: Card;
};

const normalizeFolderId = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
};

const resolveRawField = (
  record: Record<string, unknown>,
  keys: string[],
): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }

  return undefined;
};

const serializeRevisionPart = (value: unknown): string => {
  if (value instanceof Date) {
    return `date:${value.toISOString()}`;
  }

  if (Array.isArray(value)) {
    return `[${value.map(serializeRevisionPart).join(",")}]`;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();

    return `{${keys
      .map((key) => `${key}:${serializeRevisionPart(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const resolveRawCardCacheId = (raw: unknown): string | null => {
  const record = toRecord(raw);

  if (!record) {
    return null;
  }

  const id = resolveRawField(record, ["id", "cardId", "card_id"]);
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
};

const buildCardRevisionKey = (raw: unknown): string => {
  const record = toRecord(raw);

  if (!record) {
    return serializeRevisionPart(raw);
  }

  const id = resolveRawCardCacheId(raw) ?? "";
  const updatedAt = resolveRawField(record, ["updatedAt", "updated_at"]);

  if (updatedAt === undefined) {
    return serializeRevisionPart(record);
  }

  return [
    id,
    serializeRevisionPart(updatedAt),
    serializeRevisionPart(resolveRawField(record, ["deletedAt", "deleted_at"])),
    serializeRevisionPart(resolveRawField(record, ["isDeleted", "is_deleted"])),
    serializeRevisionPart(resolveRawField(record, ["folderId", "folder_id"])),
    serializeRevisionPart(resolveRawField(record, ["cardSetId", "card_set_id"])),
    serializeRevisionPart(resolveRawField(record, ["orderIndex", "order_index"])),
    serializeRevisionPart(
      resolveRawField(record, ["nextReviewDate", "next_review_date"]),
    ),
  ].join("|");
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

export const useCardsRead = (
  folderId?: string,
  cardSetId?: string,
  options?: UseCardsReadOptions,
) => {
  const { currentUser } = useAuthSession();
  const [error] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;
  const normalizedCardCacheRef = useRef<Map<string, CachedNormalizedCard>>(
    new Map(),
  );

  useEffect(() => {
    normalizedCardCacheRef.current.clear();
  }, [currentUser?.uid, folderId, cardSetId, enabled]);

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
      normalizedCardCacheRef.current = new Map();
      return [];
    }

    const previousCache = normalizedCardCacheRef.current;
    const nextCache = new Map<string, CachedNormalizedCard>();

    let normalized = rawCards.map((rawCard) => {
      const cacheId = resolveRawCardCacheId(rawCard);

      if (!cacheId) {
        return normalizeCard(rawCard);
      }

      const revisionKey = buildCardRevisionKey(rawCard);
      const cached = previousCache.get(cacheId);

      if (cached && cached.revisionKey === revisionKey) {
        nextCache.set(cacheId, cached);
        return cached.card;
      }

      const card = normalizeCard(rawCard);
      nextCache.set(cacheId, {
        revisionKey,
        card,
      });

      return card;
    });

    normalizedCardCacheRef.current = nextCache;

    normalized = normalized.filter(
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
  }, [rawCards, folderId, cardSetId, cardSetById]);

  const loading = enabled && rawCards === undefined;

  return {
    cards,
    loading,
    error,
  };
};

export type { UseCardsReadOptions };
