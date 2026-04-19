import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import {
  DEFAULT_CARD_DISPLAY_MODE,
  normalizeCardDisplayMode,
  type CardDisplayMode,
  type CardSet,
} from "@/types/domain/cardSet";

type RawCardSetRecord = CardSet & {
  isDeleted?: boolean;
  defaultDisplayMode?: CardDisplayMode | unknown;
};

const normalizeCardSetRecord = (
  raw: RawCardSetRecord | undefined | null,
): CardSet | null => {
  if (!raw || raw.isDeleted) {
    return null;
  }

  return {
    ...raw,
    folderId: raw.folderId ?? null,
    defaultDisplayMode: normalizeCardDisplayMode(
      raw.defaultDisplayMode ?? DEFAULT_CARD_DISPLAY_MODE,
    ),
  };
};

export const useCardSetById = (cardSetId: string | null) => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;

  const cardSet = useLiveQuery(async () => {
    if (!currentUserId || !cardSetId) {
      return null;
    }

    const db = await getLocalDb(currentUserId);
    const row = await db.cardSets.get(cardSetId);

    return normalizeCardSetRecord(
      (row as RawCardSetRecord | undefined | null) ?? null,
    );
  }, [currentUserId, cardSetId]);

  const updateCardSet = useCallback(
    async (
      id: string,
      data: Partial<
        Pick<CardSet, "name" | "description" | "orderIndex" | "defaultDisplayMode">
      >,
    ): Promise<void> => {
      if (!currentUserId) {
        throw new Error("認証が必要です");
      }

      const db = await getLocalDb(currentUserId);

      await db.cardSets.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    },
    [currentUserId],
  );

  return {
    cardSet: cardSet ?? null,
    loading: Boolean(currentUserId && cardSetId) && cardSet === undefined,
    updateCardSet,
  };
};
