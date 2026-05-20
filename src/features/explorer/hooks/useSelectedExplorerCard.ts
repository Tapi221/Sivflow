import { useLiveQuery } from "dexie-react-hooks";

import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";

import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";

export const useSelectedExplorerCard = (cardId: string | null) => {
  const { currentUser } = useAuthSession();

  const card = useLiveQuery(
    async () => {
      if (!currentUser || !cardId) {
        return null;
      }

      const db = await getLocalDb(currentUser.uid);
      const rawCard = await db.cards.get(cardId);
      if (!rawCard || rawCard.isDeleted) {
        return null;
      }

      return normalizeCard(rawCard);
    },
    [currentUser?.uid, cardId],
    null,
  );

  return {
    card: card ?? null,
    loading: Boolean(cardId) && card === undefined,
  };
};
