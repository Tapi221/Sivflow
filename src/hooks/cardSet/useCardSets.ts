import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDb } from "@/services/localDB";
import { useAuthSession } from "@/contexts/AuthContext";
import type { CardSet } from "@/types";

export function useCardSets(folderId?: string | null) {
  const { currentUser } = useAuthSession();

  const rawSets = useLiveQuery(async () => {
    if (!currentUser) return [];
    try {
      const db = await getLocalDb(currentUser.uid);
      return db.cardSets.where("userId").equals(currentUser.uid).toArray();
    } catch (err) {
      console.error("[useCardSets] Error:", err);
      return [];
    }
  }, [currentUser?.uid]);

  const cardSets = useMemo(() => {
    if (!rawSets) return [];

    let sets = rawSets.filter((s) => !s.isDeleted);

    if (folderId !== undefined) {
      sets = sets.filter((s) => s.folderId === (folderId ?? null));
    }

    return sets.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [rawSets, folderId]);

  const loading = rawSets === undefined;

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

    const existingSets = await db.cardSets.where("userId").equals(currentUser.uid).toArray();

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
    data: Partial<Pick<CardSet, "name" | "description" | "orderIndex">>,
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
}
