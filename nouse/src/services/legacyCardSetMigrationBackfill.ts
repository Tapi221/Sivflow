import { getLocalDb } from "@/services/localdb";
import type { Card, CardSet, Folder } from "@/types";



type LocalFirstBackfillDb = Awaited<ReturnType<typeof getLocalDb>> & {
  addItem: (table: "cardSets", item: Record<string, unknown>) => Promise<string>;
  updateItem: (table: "cards" | "cardSets", id: string, changes: Record<string, unknown>) => Promise<number>;
};
type LegacyCardSetCleanupResult = {
  deletedSetIds: Set<string>;
  replacementByDeletedSetId: Map<string, string>;
};
type LegacyCardSetFields = {
  description?: string | null;
  defaultDisplayMode?: string | null;
};
type LegacyCard = Omit<Card, "cardSetId"> & {
  cardSetId?: string | null;
};



const backfillPromiseByUserId = new Map<string, Promise<void>>();
const LEGACY_IMPORTED_CARD_FOLDER_NAME = "インポート済みカード";
const LEGACY_IMPORTED_CARD_SET_SUFFIX = " セット";



const createId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cardset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
const getTrimmedText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const getFolderId = (folder: Folder): string => {
  return String(folder.id ?? folder.folderId ?? "");
};
const getFolderDisplayName = (folder: Folder): string => {
  return getTrimmedText(folder.folderName) ?? LEGACY_IMPORTED_CARD_FOLDER_NAME;
};
const getGeneratedSetBaseName = (folderId: string | null, folderNameById: Map<string, string>): string => {
  if (!folderId) return LEGACY_IMPORTED_CARD_FOLDER_NAME;
  return folderNameById.get(folderId) ?? LEGACY_IMPORTED_CARD_FOLDER_NAME;
};
const getGeneratedSetName = (folderId: string | null, folderNameById: Map<string, string>): string => {
  return `${getGeneratedSetBaseName(folderId, folderNameById)}${LEGACY_IMPORTED_CARD_SET_SUFFIX}`;
};
const getCardSetFolderKey = (folderId: string | null | undefined): string => {
  return folderId ?? "__root__";
};
const getCardSetId = (card: Card): string | null => {
  return (card as LegacyCard).cardSetId ?? null;
};
const isDeletedCardSet = (set: CardSet): boolean => {
  return Boolean(set.isDeleted);
};
const isLegacyGeneratedCardSet = (set: CardSet, folderNameById: Map<string, string>): boolean => {
  const legacy = set as CardSet & LegacyCardSetFields;
  if (legacy.description !== null && legacy.description !== undefined) return false;
  if (legacy.defaultDisplayMode !== null && legacy.defaultDisplayMode !== undefined) return false;
  return set.name === getGeneratedSetName(set.folderId ?? null, folderNameById);
};
const compareLegacyGeneratedCardSets = (left: CardSet, right: CardSet): number => {
  const orderCompare = (left.orderIndex ?? 0) - (right.orderIndex ?? 0);
  if (orderCompare !== 0) return orderCompare;
  const createdCompare = toMillis(left.createdAt) - toMillis(right.createdAt);
  if (createdCompare !== 0) return createdCompare;
  return left.id.localeCompare(right.id);
};
const toMillis = (value: unknown): number => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
  }
  if (!value || typeof value !== "object") {
    return 0;
  }
  const timestamp = value as { toMillis?: () => unknown; toDate?: () => unknown; seconds?: unknown; _seconds?: unknown; nanoseconds?: unknown; _nanoseconds?: unknown; };
  if (typeof timestamp.toMillis === "function") {
    const millis = timestamp.toMillis();
    if (typeof millis === "number" && Number.isFinite(millis)) return millis;
  }
  if (typeof timestamp.toDate === "function") {
    const date = timestamp.toDate();
    if (date instanceof Date && Number.isFinite(date.getTime())) return date.getTime();
  }
  const seconds = timestamp.seconds ?? timestamp._seconds;
  const nanoseconds = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;
  if (typeof seconds === "number" && Number.isFinite(seconds)) {
    return seconds * 1000 + (typeof nanoseconds === "number" && Number.isFinite(nanoseconds) ? Math.floor(nanoseconds / 1_000_000) : 0);
  }
  return 0;
};
const getNormalizedCardSetId = (card: Card, replacementByDeletedSetId: Map<string, string>): string | null => {
  const cardSetId = getCardSetId(card);
  if (!cardSetId) return cardSetId;
  return replacementByDeletedSetId.get(cardSetId) ?? cardSetId;
};
const createNormalizedCard = (card: Card, replacementByDeletedSetId: Map<string, string>): Card => {
  const currentCardSetId = getCardSetId(card);
  const nextCardSetId = getNormalizedCardSetId(card, replacementByDeletedSetId);
  if (nextCardSetId === currentCardSetId) return card;
  return { ...card, cardSetId: nextCardSetId ?? "" };
};
const mergeDuplicateLegacyGeneratedCardSets = async ({ syncDb, activeSets, activeCards, folderNameById, now }: { syncDb: LocalFirstBackfillDb; activeSets: CardSet[]; activeCards: Card[]; folderNameById: Map<string, string>; now: Date; }): Promise<LegacyCardSetCleanupResult> => {
  const generatedSetsByFolder = new Map<string, CardSet[]>();
  const deletedSetIds = new Set<string>();
  const replacementByDeletedSetId = new Map<string, string>();
  for (const set of activeSets) {
    if (!isLegacyGeneratedCardSet(set, folderNameById)) continue;
    const key = getCardSetFolderKey(set.folderId ?? null);
    const group = generatedSetsByFolder.get(key);
    if (group) group.push(set);
    else generatedSetsByFolder.set(key, [set]);
  }
  for (const group of generatedSetsByFolder.values()) {
    if (group.length < 2) continue;
    const [keeper, ...duplicates] = [...group].sort(compareLegacyGeneratedCardSets);
    for (const duplicate of duplicates) {
      deletedSetIds.add(duplicate.id);
      replacementByDeletedSetId.set(duplicate.id, keeper.id);
    }
  }
  if (deletedSetIds.size === 0) {
    return { deletedSetIds, replacementByDeletedSetId };
  }
  for (const card of activeCards) {
    const cardSetId = getCardSetId(card);
    if (!cardSetId) continue;
    const replacementCardSetId = replacementByDeletedSetId.get(cardSetId);
    if (!replacementCardSetId) continue;
    await syncDb.updateItem("cards", card.id, {
      cardSetId: replacementCardSetId,
      updatedAt: now,
    });
  }
  for (const duplicateSetId of deletedSetIds) {
    await syncDb.updateItem("cardSets", duplicateSetId, {
      isDeleted: true,
      updatedAt: now,
    });
  }
  return { deletedSetIds, replacementByDeletedSetId };
};
const backfillLegacyCardsToCardSets = async (userId: string): Promise<void> => {
  const db = await getLocalDb(userId);
  const syncDb = db as LocalFirstBackfillDb;
  const now = new Date();
  const rawActiveCards = await db.cards.where("userId").equals(userId).and((card: Card) => !card.isDeleted).toArray();
  const folders = await db.folders.where("userId").equals(userId).toArray();
  const folderNameById = new Map(folders.map((folder: Folder) => [getFolderId(folder), getFolderDisplayName(folder)]));
  const sets = await db.cardSets.where("userId").equals(userId).toArray();
  const activeSets = sets.filter((set: CardSet) => !isDeletedCardSet(set));
  const duplicateCleanup = await mergeDuplicateLegacyGeneratedCardSets({
    syncDb,
    activeSets,
    activeCards: rawActiveCards,
    folderNameById,
    now,
  });
  const activeCards = rawActiveCards.map((card: Card) => createNormalizedCard(card, duplicateCleanup.replacementByDeletedSetId));
  const legacyCards = activeCards.filter((card) => !card.cardSetId);
  const normalizedActiveSets = activeSets.filter((set: CardSet) => !duplicateCleanup.deletedSetIds.has(set.id));
  const activeSetIds = new Set(normalizedActiveSets.map((set: CardSet) => set.id));
  const deletedSetById = new Map(sets.filter((set: CardSet) => set.isDeleted).map((set: CardSet) => [set.id, set] as const));
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
  for (const set of normalizedActiveSets) {
    const key = getCardSetFolderKey(set.folderId ?? null);
    if (!setByFolder.has(key)) {
      setByFolder.set(key, set);
    }
    nextOrderIndexByFolder.set(key, Math.max(nextOrderIndexByFolder.get(key) ?? 0, (set.orderIndex ?? 0) + 1));
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
      const folderKey = getCardSetFolderKey(folderId);
      const folderName = getGeneratedSetBaseName(folderId, folderNameById);
      const deletedSet = deletedSetById.get(missingSetId);
      const restoredOrder = nextOrderIndexByFolder.get(folderKey) ?? 0;
      const sampleDeviceId = getTrimmedText(sample?.deviceId);
      const deletedSetDeviceId = getTrimmedText(deletedSet?.deviceId);
      const deviceId = sampleDeviceId ?? deletedSetDeviceId ?? "web";
      let targetSet = setByFolder.get(folderKey) ?? null;
      if (!targetSet) {
        if (deletedSet) {
          await syncDb.updateItem("cardSets", missingSetId, {
            isDeleted: false,
            folderId,
            deviceId,
            updatedAt: now,
          });
          targetSet = {
            ...deletedSet,
            isDeleted: false,
            folderId,
            deviceId,
            updatedAt: now,
          };
        } else {
          targetSet = {
            id: missingSetId,
            userId,
            deviceId,
            folderId,
            name: `${folderName}${LEGACY_IMPORTED_CARD_SET_SUFFIX}`,
            orderIndex: restoredOrder,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          } as CardSet;
          await syncDb.addItem("cardSets", targetSet as unknown as Record<string, unknown>);
        }
        setByFolder.set(folderKey, targetSet);
        nextOrderIndexByFolder.set(folderKey, restoredOrder + 1);
      }
      for (const card of cards) {
        if (getCardSetId(card) === targetSet.id) continue;
        await syncDb.updateItem("cards", card.id, {
          cardSetId: targetSet.id,
          updatedAt: now,
        });
      }
    }
    for (const [folderKey, cards] of groups.entries()) {
      let targetSet = setByFolder.get(folderKey);
      if (!targetSet) {
        const folderId = folderKey === "__root__" ? null : folderKey;
        const folderName = getGeneratedSetBaseName(folderId, folderNameById);
        const sampleCard = cards[0];
        const createdSet: CardSet = {
          id: createId(),
          userId,
          deviceId: getTrimmedText(sampleCard?.deviceId) ?? "web",
          folderId,
          name: `${folderName}${LEGACY_IMPORTED_CARD_SET_SUFFIX}`,
          orderIndex: nextOrderIndexByFolder.get(folderKey) ?? 0,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };
        await syncDb.addItem("cardSets", createdSet as unknown as Record<string, unknown>);
        targetSet = createdSet;
        setByFolder.set(folderKey, createdSet);
        nextOrderIndexByFolder.set(folderKey, (nextOrderIndexByFolder.get(folderKey) ?? 0) + 1);
      }
      for (const card of cards) {
        await syncDb.updateItem("cards", card.id, {
          cardSetId: targetSet.id,
          updatedAt: now,
        });
      }
    }
  });
  console.info(`[AppInit:${userId}] CardSet backfill repaired ${legacyCards.length} legacy cards and ${danglingCardsBySetId.size} missing sets.`);
};
const ensureLegacyCardsBackfilled = async (userId: string) => {
  const existing = backfillPromiseByUserId.get(userId);
  if (existing) return existing;
  const promise = backfillLegacyCardsToCardSets(userId).catch((error) => {
    backfillPromiseByUserId.delete(userId);
    throw error;
  });
  backfillPromiseByUserId.set(userId, promise);
  await promise;
};



export { backfillLegacyCardsToCardSets, ensureLegacyCardsBackfilled };
