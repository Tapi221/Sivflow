import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffectiveLocalUserId } from "@/hooks/auth/useEffectiveLocalUserId";
import { getLocalDb } from "@/services/localDB";
import { type CardDisplayMode, type CardSet, DEFAULT_CARD_DISPLAY_MODE, normalizeCardDisplayMode } from "@/types/domain/cardSet";

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
  const userId = useEffectiveLocalUserId();

  const cardSet = useLiveQuery(async () => {
    if (!cardSetId) {
      return null;
    }

    if (!userId) {
      return undefined;
    }

    const db = await getLocalDb(userId);
    const row = await db.cardSets.get(cardSetId);

    return normalizeCardSetRecord(
      (row as RawCardSetRecord | undefined | null) ?? null,
    );
  }, [userId, cardSetId]);

  const updateCardSet = useCallback(
    async (
      id: string,
      data: Partial<
        Pick<
          CardSet,
          "name" | "description" | "orderIndex" | "defaultDisplayMode"
        >
      >,
    ): Promise<void> => {
      if (!userId) {
        throw new Error("認証が必要です");
      }

      const db = await getLocalDb(userId);

      await db.cardSets.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    },
    [userId],
  );

  return {
    cardSet: cardSet ?? null,
    loading: Boolean(cardSetId) && cardSet === undefined,
    updateCardSet,
  };
};
