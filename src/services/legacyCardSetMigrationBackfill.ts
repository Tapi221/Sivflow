import { getLocalDb } from "./localDB";
import type { Card, CardSet, Folder } from "@/types";

const backfillPromiseByUserId = new Map<string, Promise<void>>();

const createId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `cardset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const backfillLegacyCardsToCardSets = async (
  userId: string,
): Promise<void> => {
  const db = await getLocalDb(userId);
  const now = new Date();

  const activeCards = await db.cards
    .where("userId")
    .equals(userId)
    .and((card: Card) => !card.isDeleted)
    .toArray();

  const legacyCards = activeCards.filter((card) => !card.cardSetId);
  const folders = await db.folders.where("userId").equals(userId).toArray();
  const folderNameById = new Map(
    folders.map((folder: Folder) => [
      String(folder.id ?? folder.folderId ?? ""),
      String(folder.folderName ?? ""),
    ]),
  );

  const sets = await db.cardSets.where("userId").equals(userId).toArray();
  const activeSets = sets.filter((set: CardSet) => !set.isDeleted);
  const activeSetIds = new Set(activeSets.map((set: CardSet) => set.id));
  const deletedSetById = new Map(
    sets
      .filter((set: CardSet) => set.isDeleted)
      .map((set: CardSet) => [set.id, set] as const),
  );

  const danglingCardsBySetId = new Map<string, Card[]>();
  for (const card of activeCards) {
    const cardSetId = card.cardSetId?.trim();
    if (!cardSetId || activeSetIds.has(cardSetId)) continue;

    const existing = danglingCardsBySetId.get(cardSetId);
    if (existing) {
      existing.push(card);
    } else {
      danglingCardsBySetId.set(cardSetId, [card]);
    }
  }

  if (legacyCards.length === 0 && danglingCardsBySetId.size === 0) return;

  const setByFolder = new Map<string, CardSet>();
  const nextOrderIndexByFolder = new Map<string, number>();

  for (const set of activeSets) {
    const key = set.folderId ?? "__root__";
    if (!setByFolder.has(key)) {
      setByFolder.set(key, set);
    }

    nextOrderIndexByFolder.set(
      key,
      Math.max(nextOrderIndexByFolder.get(key) ?? 0, (set.orderIndex ?? 0) + 1),
    );
  }

  const groups = new Map<string, Card[]>();
  for (const card of legacyCards) {
    const key = card.folderId ? String(card.folderId) : "__root__";
    const existing = groups.get(key);
    if (existing) {
      existing.push(card);
    } else {
      groups.set(key, [card]);
    }
  }

  await db.runSyncTransaction(async () => {
    for (const [missingSetId, cards] of danglingCardsBySetId.entries()) {
      const sample = cards[0];
      const folderId = sample?.folderId ? String(sample.folderId) : null;
      const folderKey = folderId ?? "__root__";
      const folderName = folderId
        ? folderNameById.get(folderId) || "インポート済みカード"
        : "インポート済みカード";
      const deletedSet = deletedSetById.get(missingSetId);
      const restoredOrder = nextOrderIndexByFolder.get(folderKey) ?? 0;
      const deviceId = sample?.deviceId || deletedSet?.deviceId || "web";

      if (deletedSet) {
        await db.cardSets.update(missingSetId, {
          isDeleted: false,
          folderId,
          deviceId,
          updatedAt: now,
        });
      } else {
        await db.cardSets.add({
          id: missingSetId,
          userId,
          deviceId,
          folderId,
          name: `${folderName} セット`,
          orderIndex: restoredOrder,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (!setByFolder.has(folderKey)) {
        setByFolder.set(folderKey, {
          id: missingSetId,
          userId,
          deviceId,
          folderId,
          name: deletedSet?.name || `${folderName} セット`,
          orderIndex: restoredOrder,
          isDeleted: false,
          createdAt: deletedSet?.createdAt ?? now,
          updatedAt: now,
        });
      }

      nextOrderIndexByFolder.set(folderKey, restoredOrder + 1);
    }

    for (const [folderKey, cards] of groups.entries()) {
      let targetSet = setByFolder.get(folderKey);

      if (!targetSet) {
        const folderId = folderKey === "__root__" ? null : folderKey;
        const folderName = folderId
          ? folderNameById.get(folderId) || "インポート済みカード"
          : "インポート済みカード";

        const sampleCard = cards[0];
        const createdSet: CardSet = {
          id: createId(),
          userId,
          deviceId: sampleCard?.deviceId || "web",
          folderId,
          name: `${folderName} セット`,
          orderIndex: nextOrderIndexByFolder.get(folderKey) ?? 0,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };

        await db.cardSets.add(createdSet);
        targetSet = createdSet;
        setByFolder.set(folderKey, createdSet);
        nextOrderIndexByFolder.set(
          folderKey,
          (nextOrderIndexByFolder.get(folderKey) ?? 0) + 1,
        );
      }

      for (const card of cards) {
        await db.cards.update(card.id, {
          cardSetId: targetSet.id,
          updatedAt: now,
        });
      }
    }
  });

  console.info(
    `[AppInit:${userId}] CardSet backfill repaired ${legacyCards.length} legacy cards and ${danglingCardsBySetId.size} missing sets.`,
  );
};

export const ensureLegacyCardsBackfilled = async (userId: string) => {
  const existing = backfillPromiseByUserId.get(userId);
  if (existing) return existing;

  const promise = backfillLegacyCardsToCardSets(userId).catch((error) => {
    backfillPromiseByUserId.delete(userId);
    throw error;
  });

  backfillPromiseByUserId.set(userId, promise);
  await promise;
};
