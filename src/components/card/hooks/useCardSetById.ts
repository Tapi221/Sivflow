import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffectiveLocalUserId } from "@/contexts/auth/useEffectiveLocalUserId";
import { getLocalDb } from "@/services/localdb";
import type { CardDisplayMode, CardSet } from "@/types/domain/cardSet";
import { DEFAULT_CARD_DISPLAY_MODE, normalizeCardDisplayMode } from "@/types/domain/cardSet";



type RawCardSetRecord = CardSet & {
  isDeleted?: boolean;
  defaultDisplayMode?: CardDisplayMode | unknown;
};
type CardSetUpdateCapableDb = Awaited<ReturnType<typeof getLocalDb>> & {
  updateItem: (table: "cardSets", id: string, changes: Record<string, unknown>) => Promise<number>;
};



const normalizeCardSetRecord = (raw: RawCardSetRecord | undefined | null): CardSet | null => {
  if (!raw || raw.isDeleted) {
    return null;
  }

  return {
    ...raw,
    folderId: raw.folderId ?? null,
    defaultDisplayMode: normalizeCardDisplayMode(raw.defaultDisplayMode ?? DEFAULT_CARD_DISPLAY_MODE),
  };
};
const useCardSetById = (cardSetId: string | null) => {
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

    return normalizeCardSetRecord((row as RawCardSetRecord | undefined | null) ?? null);
  }, [userId, cardSetId]);

  const updateCardSet = useCallback(
    async (id: string, data: Partial<Pick<CardSet, "name" | "description" | "orderIndex" | "defaultDisplayMode">>): Promise<void> => {
      if (!userId) {
        throw new Error("認証が必要です");
      }

      const db = (await getLocalDb(userId)) as CardSetUpdateCapableDb;
      await db.updateItem("cardSets", id, {
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



export { useCardSetById };
