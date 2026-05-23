import { useMemo } from "react";

import { useLiveQuery } from "dexie-react-hooks";

import { useAuthSession } from "@/contexts/AuthContext";
import { compareOrderableEntities } from "@/lib/orderableEntity";
import { getLocalDb } from "@/services/localDB";
import type { CardSet } from "@/types";
import { DEFAULT_CARD_DISPLAY_MODE } from "@/types/domain/cardSet";

type UseCardSetsOptions = {
  enabled?: boolean;
};

export const useCardSets = (
  folderId?: string | null,
  options?: UseCardSetsOptions,
) => {
  const { currentUser } = useAuthSession();
  const userId = currentUser?.uid ?? null;
  const enabled = options?.enabled ?? true;

  const rawSets = useLiveQuery(async () => {
    if (!enabled) return [];
    if (!userId) return [];
    try {
      const db = await getLocalDb(userId);
      return db.cardSets.where("userId").equals(userId).toArray();
    } catch (err) {
      console.error("[useCardSets] Error:", err);
      return [];
    }
  }, [enabled, userId]);

  const cardSets = useMemo(() => {
    if (!rawSets) return [];

    let sets = rawSets.filter((s) => !s.isDeleted);

    if (folderId !== undefined) {
      sets = sets.filter((s) => s.folderId === (folderId ?? null));
    }

    return sets.sort((a, b) =>
      compareOrderableEntities(a, b, {
        getOrderIndex: (cardSet) => cardSet.orderIndex,
        getUpdatedAt: (cardSet) => cardSet.updatedAt,
        getCreatedAt: (cardSet) => cardSet.createdAt,
        getName: (cardSet) => cardSet.name,
        getId: (cardSet) => cardSet.id,
      }),
    );
  }, [rawSets, folderId]);

  const loading = enabled && rawSets === undefined;

  const createCardSet = async (
    name: string,
    targetFolderId?: string | null,
    opts?: {
      description?: string;
      id?: string;
      orderIndex?: number;
    },
  ): Promise<CardSet> => {
    if (!currentUser) throw new Error("認証が必要です");

    if (!targetFolderId) {
      throw new Error("カードセットはフォルダ配下にのみ作成できます");
    }

    const db = await getLocalDb(currentUser.uid);

    const existingSets = await db.cardSets
      .where("userId")
      .equals(currentUser.uid)
      .toArray();

    const siblingSets = existingSets.filter(
      (s) => !s.isDeleted && s.folderId === targetFolderId,
    );

    const now = new Date();
    const orderIndex = opts?.orderIndex ?? 0;

    const cardSet: CardSet = {
      id: opts?.id ?? crypto.randomUUID(),
      userId: currentUser.uid,
      deviceId: "web",
      folderId: targetFolderId,
      name,
      description: opts?.description,
      orderIndex,
      defaultDisplayMode: DEFAULT_CARD_DISPLAY_MODE,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    if (orderIndex === 0 && siblingSets.length > 0) {
      await Promise.all(
        siblingSets.map((sibling) =>
          db.cardSets.update(sibling.id, {
            orderIndex: (sibling.orderIndex ?? 0) + 1,
            updatedAt: now,
          }),
        ),
      );
    }

    await db.cardSets.add(cardSet);
    return cardSet;
  };

  const updateCardSet = async (
    id: string,
    data: Partial<
      Pick<
        CardSet,
        "name" | "description" | "orderIndex" | "defaultDisplayMode"
      >
    >,
  ): Promise<void> => {
    if (!currentUser) throw new Error("認証が必要です");

    const db = await getLocalDb(currentUser.uid);
    await db.cardSets.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  };

  const moveCardSetToFolder = async (
    cardSetId: string,
    targetFolderId?: string | null,
  ): Promise<void> => {
    if (!currentUser) throw new Error("認証が必要です");

    if (!targetFolderId) {
      throw new Error("カードセットをルート直下へ移動することはできません");
    }

    const db = await getLocalDb(currentUser.uid);

    const siblingSets = (rawSets ?? []).filter(
      (s) => !s.isDeleted && s.folderId === targetFolderId,
    );

    const maxOrder = siblingSets.reduce(
      (m, s) => Math.max(m, s.orderIndex ?? 0),
      -1,
    );

    await db.cardSets.update(cardSetId, {
      folderId: targetFolderId,
      orderIndex: maxOrder + 1,
      updatedAt: new Date(),
    });
  };

  const deleteCardSet = async (id: string): Promise<void> => {
    if (!currentUser) throw new Error("認証が必要です");

    const db = await getLocalDb(currentUser.uid);
    const now = new Date();

    const cards = await db.cards.where("cardSetId").equals(id).toArray();

    await Promise.all(
      cards.map((card) =>
        db.cards.update(card.id, {
          isDeleted: true,
          updatedAt: now,
        }),
      ),
    );

    await db.cardSets.update(id, {
      isDeleted: true,
      updatedAt: now,
    });
  };

  return {
    cardSets,
    loading,
    createCardSet,
    updateCardSet,
    moveCardSetToFolder,
    deleteCardSet,
  };
};
