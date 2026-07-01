import type { Card, CardSet, Folder } from "@/types";
import { normalizeDate } from "@/utils/codec/date";



type CardSetDashboardRow = {
  id: string; title: string; description: string; folderId: string | null; categoryLabel: string; folderPathLabel: string; storagePathLabel: string; cardCount: number; updatedAt: Date | null; createdAt: Date | null; tags: string[]; orderIndex: number };
type BuildCardSetDashboardRowsParams = {
  cardSets: CardSet[]; cards: Card[]; folders: Folder[]; tagById: ReadonlyMap<string, { name: string }> };
type CardWithLegacyCardSetId = Card & { card_set_id?: string | null };



const resolveCardSetId = (card: Card): string | null => {
  const normalizedCard = card as CardWithLegacyCardSetId;
  const cardSetId = normalizedCard.cardSetId ?? normalizedCard.card_set_id ?? null;
  if (typeof cardSetId !== "string") return null;
  const trimmed = cardSetId.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const resolveFolderName = (folder: Folder | undefined): string => folder?.folderName?.trim() ?? "未分類";
const resolveFolderPathLabel = (folderPath: string[]): string => folderPath.length > 0 ? folderPath.join(" / ") : "未分類";
const resolveOrderIndex = (value: unknown): number => {
  const orderIndex = Number(value);
  return Number.isFinite(orderIndex) ? orderIndex : 0;
};
const buildFolderPath = (folderId: string | null, folderById: Map<string, Folder>): string[] => {
  const path: string[] = [];
  const visited = new Set<string>();
  let currentFolderId: string | null | undefined = folderId;
  while (currentFolderId && !visited.has(currentFolderId)) {
    const folder = folderById.get(currentFolderId);
    if (!folder) break;
    path.unshift(resolveFolderName(folder));
    visited.add(currentFolderId);
    currentFolderId = folder.parentFolderId ?? null;
  }
  return path;
};
const resolveCategoryLabel = (folderId: string | null, folderById: Map<string, Folder>): string => {
  const path = buildFolderPath(folderId, folderById);
  return path[0] ?? "未分類";
};
const resolveDisplayTags = (cardSet: CardSet, tagById: ReadonlyMap<string, { name: string }>): string[] => {
  const explicitTags = (Array.isArray(cardSet.tags) ? cardSet.tags : [])
    .map((tagIdOrName) => tagById.get(tagIdOrName)?.name ?? tagIdOrName)
    .filter((label): label is string => typeof label === "string" && label.trim().length > 0);
  return Array.from(new Set(explicitTags)).slice(0, 3);
};
const buildCardSetDashboardRows = ({ cardSets, cards, folders, tagById }: BuildCardSetDashboardRowsParams): CardSetDashboardRow[] => {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const cardCountByCardSetId = new Map<string, number>();
  cards.forEach((card) => {
    if (card.isDeleted) return;
    const cardSetId = resolveCardSetId(card);
    if (!cardSetId) return;
    cardCountByCardSetId.set(cardSetId, (cardCountByCardSetId.get(cardSetId) ?? 0) + 1);
  });
  return cardSets
    .filter((cardSet) => !cardSet.isDeleted)
    .map((cardSet) => {
      const folderId = cardSet.folderId ?? null;
      const folderPath = buildFolderPath(folderId, folderById);
      const categoryLabel = resolveCategoryLabel(folderId, folderById);
      return {
        id: cardSet.id,
        title: cardSet.name?.trim() ?? "無題のセット",
        description: cardSet.description?.trim() ?? "",
        folderId,
        categoryLabel,
        folderPathLabel: resolveFolderPathLabel(folderPath),
        storagePathLabel: ["ライブラリ", "Flashcard", ...folderPath].join(" / "),
        cardCount: cardCountByCardSetId.get(cardSet.id) ?? 0,
        updatedAt: normalizeDate(cardSet.updatedAt),
        createdAt: normalizeDate(cardSet.createdAt),
        tags: resolveDisplayTags(cardSet, tagById),
        orderIndex: resolveOrderIndex(cardSet.orderIndex),
      } satisfies CardSetDashboardRow;
    })
    .sort((left, right) => {
      const rightTime = right.updatedAt?.getTime() ?? 0;
      const leftTime = left.updatedAt?.getTime() ?? 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
      if (right.orderIndex !== left.orderIndex) return right.orderIndex - left.orderIndex;
      return left.title.localeCompare(right.title, "ja");
    });
};



export { buildCardSetDashboardRows };


export type { CardSetDashboardRow };
