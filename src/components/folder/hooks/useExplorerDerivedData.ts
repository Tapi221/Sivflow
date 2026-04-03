import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import {
  ROOT_FOLDER_ID,
  getEntityTime,
  getFolderId,
  getParentFolderId,
  isSameFolder,
  normalizeFolderId,
} from "@/components/folder/explorer/model/utils";
import { compareOrderableEntities } from "@/lib/orderableEntity";
import type { Card, CardSet, DocumentItem, ExplorerItem } from "@/types";
import { useCallback, useMemo } from "react";

type LegacyEntityFields = {
  isDeleted?: boolean;
  is_deleted?: boolean;
  folder_id?: string | null;
  card_set_id?: string | null;
  orderIndex?: number;
};

const isSoftDeleted = (
  entity?: { isDeleted?: boolean; is_deleted?: boolean } | null,
) => Boolean(entity?.isDeleted ?? entity?.is_deleted);

const withLegacy = <T extends object>(v: T): T & LegacyEntityFields =>
  v as T & LegacyEntityFields;

interface Params {
  treeFolders: FolderTreeNode[];
  treeCards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  isFiltering: boolean;
}

const getFolderOrder = (folder: FolderTreeNode) => {
  return ((folder as { orderIndex?: number; order_index?: number })
    .orderIndex ??
    (folder as { orderIndex?: number; order_index?: number }).order_index ??
    0) as number;
};

const getFolderName = (folder: FolderTreeNode) => {
  return String(
    (folder as { folderName?: string; folder_name?: string }).folderName ??
      (folder as { folderName?: string; folder_name?: string }).folder_name ??
      "",
  );
};

const compareFolders = (a: FolderTreeNode, b: FolderTreeNode) => {
  return compareOrderableEntities(a, b, {
    getOrderIndex: getFolderOrder,
    getUpdatedAt: (folder) =>
      getEntityTime((folder as { updatedAt?: unknown }).updatedAt),
    getCreatedAt: (folder) =>
      getEntityTime((folder as { createdAt?: unknown }).createdAt),
    getName: getFolderName,
    getId: getFolderId,
  });
};

export const useExplorerDerivedData = ({
  treeFolders,
  treeCards,
  cardSets = [],
  documents,
  isFiltering,
}: Params) => {
  const childFoldersByParentId = useMemo(() => {
    const map = new Map<string, FolderTreeNode[]>();
    for (const folder of treeFolders) {
      const isHidden =
        (folder as { isHidden?: boolean; is_hidden?: boolean }).isHidden ??
        (folder as { isHidden?: boolean; is_hidden?: boolean }).is_hidden;
      if (isSoftDeleted(folder) || isHidden) continue;
      const parentId = normalizeFolderId(getParentFolderId(folder));
      const siblings = map.get(parentId);
      if (siblings) siblings.push(folder);
      else map.set(parentId, [folder]);
    }
    for (const siblings of map.values()) {
      siblings.sort(compareFolders);
    }
    return map;
  }, [treeFolders]);

  const rootFolders = useMemo(
    () => childFoldersByParentId.get(ROOT_FOLDER_ID) ?? [],
    [childFoldersByParentId],
  );

  const getChildFolders = useCallback(
    (parentId: string) => childFoldersByParentId.get(parentId) ?? [],
    [childFoldersByParentId],
  );

  const visibleFolderIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const folder of treeFolders) {
      const isHidden =
        (folder as { isHidden?: boolean; is_hidden?: boolean }).isHidden ??
        (folder as { isHidden?: boolean; is_hidden?: boolean }).is_hidden;
      if (isSoftDeleted(folder) || isHidden) continue;
      const id = getFolderId(folder);
      if (id) set.add(id);
    }
    return set;
  }, [treeFolders]);

  const resolveTreeFolderId = useCallback(
    (folderId: string | null | undefined) => {
      const normalized = normalizeFolderId(folderId);
      if (normalized === ROOT_FOLDER_ID) return ROOT_FOLDER_ID;
      return visibleFolderIdSet.has(normalized) ? normalized : ROOT_FOLDER_ID;
    },
    [visibleFolderIdSet],
  );

  const hasValidFolderBinding = useCallback(
    (folderId: string | null | undefined) => {
      const normalized = normalizeFolderId(folderId);
      if (normalized === ROOT_FOLDER_ID) return false;
      return visibleFolderIdSet.has(normalized);
    },
    [visibleFolderIdSet],
  );

  const directCardCountByFolderId = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of treeCards) {
      if (isSoftDeleted(withLegacy(card))) continue;
      if (!hasValidFolderBinding(card.folderId ?? withLegacy(card).folder_id))
        continue;
      const folderId = resolveTreeFolderId(
        card.folderId ?? withLegacy(card).folder_id,
      );
      map.set(folderId, (map.get(folderId) ?? 0) + 1);
    }
    return map;
  }, [treeCards, resolveTreeFolderId, hasValidFolderBinding]);

  const itemsByFolderId = useMemo(() => {
    const map = new Map<string, ExplorerItem[]>();
    const pushItem = (
      folderId: string | null | undefined,
      item: ExplorerItem,
    ) => {
      const key = normalizeFolderId(folderId);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    };

    for (const card of treeCards) {
      if (isSoftDeleted(withLegacy(card))) continue;
      if (!hasValidFolderBinding(card.folderId ?? withLegacy(card).folder_id))
        continue;
      pushItem(
        resolveTreeFolderId(card.folderId ?? withLegacy(card).folder_id),
        {
          type: "card",
          data: card,
        },
      );
    }
    for (const doc of documents) {
      if (isSoftDeleted(withLegacy(doc))) continue;
      if (!hasValidFolderBinding(doc.folderId ?? withLegacy(doc).folder_id))
        continue;
      pushItem(resolveTreeFolderId(doc.folderId ?? withLegacy(doc).folder_id), {
        type: "document",
        data: doc,
      });
    }

    for (const list of map.values()) {
      list.sort((a, b) => {
        const orderA = withLegacy(a.data).orderIndex ?? Number.MAX_SAFE_INTEGER;
        const orderB = withLegacy(b.data).orderIndex ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = getEntityTime(
          (a.data as { updatedAt?: unknown }).updatedAt,
        );
        const timeB = getEntityTime(
          (b.data as { updatedAt?: unknown }).updatedAt,
        );
        return timeB - timeA;
      });
    }
    return map;
  }, [treeCards, documents, resolveTreeFolderId, hasValidFolderBinding]);

  const getFolderItems = useCallback(
    (folderId: string | null): ExplorerItem[] =>
      itemsByFolderId.get(normalizeFolderId(folderId)) ?? [],
    [itemsByFolderId],
  );

  const matchCountMap = useMemo(() => {
    if (!isFiltering) return new Map<string, number>();
    const map = new Map<string, number>();
    const calc = (folderId: string): number => {
      if (map.has(folderId)) return map.get(folderId)!;
      const directCount = getFolderItems(folderId).length;
      const children = getChildFolders(folderId);
      const childCount = children.reduce(
        (acc, child) => acc + calc(getFolderId(child)),
        0,
      );
      const total = directCount + childCount;
      map.set(folderId, total);
      return total;
    };
    for (const folder of treeFolders) {
      const folderId = getFolderId(folder);
      if (!map.has(folderId)) calc(folderId);
    }
    return map;
  }, [isFiltering, treeFolders, getFolderItems, getChildFolders]);

  const deleteTargetCounts = useCallback(
    (deleteTargetFolderId: string | null) => {
      if (!deleteTargetFolderId) return { cardCount: 0, subfolderCount: 0 };
      let cardCount = 0;
      let subfolderCount = 0;
      const stack = [deleteTargetFolderId];
      while (stack.length > 0) {
        const folderId = stack.pop()!;
        cardCount += directCardCountByFolderId.get(folderId) ?? 0;
        const children = childFoldersByParentId.get(folderId) ?? [];
        subfolderCount += children.length;
        for (const child of children) stack.push(getFolderId(child));
      }
      return { cardCount, subfolderCount };
    },
    [directCardCountByFolderId, childFoldersByParentId],
  );

  const getNextOrderIndex = useCallback(
    (folderId: string | null, resolvedFolderId?: string) => {
      const targetFolderId = resolvedFolderId ?? resolveTreeFolderId(folderId);
      let maxOrder = -1;
      for (const card of treeCards) {
        if (isSoftDeleted(withLegacy(card))) continue;
        const cardFolderId = resolveTreeFolderId(
          card.folderId ?? withLegacy(card).folder_id,
        );
        if (!isSameFolder(cardFolderId, targetFolderId)) continue;
        const order = withLegacy(card).orderIndex ?? -1;
        if (order > maxOrder) maxOrder = order;
      }
      for (const doc of documents) {
        if (isSoftDeleted(withLegacy(doc))) continue;
        const docFolderId = resolveTreeFolderId(
          doc.folderId ?? withLegacy(doc).folder_id,
        );
        if (!isSameFolder(docFolderId, targetFolderId)) continue;
        const order = withLegacy(doc).orderIndex ?? -1;
        if (order > maxOrder) maxOrder = order;
      }
      return maxOrder + 1;
    },
    [treeCards, documents, resolveTreeFolderId],
  );

  const getUniqueFolderName = useCallback(
    (parentId: string | null, defaultName: string) => {
      const siblings = treeFolders.filter((folder) => {
        if (isSoftDeleted(folder)) return false;
        return isSameFolder(getParentFolderId(folder), parentId);
      });
      const names = new Set(
        siblings
          .map((f) =>
            String(
              (f as { folderName?: string; folder_name?: string }).folderName ??
                (f as { folderName?: string; folder_name?: string })
                  .folder_name ??
                "",
            ).trim(),
          )
          .filter(Boolean),
      );
      if (!names.has(defaultName)) return defaultName;
      let next = 2;
      while (names.has(`${defaultName} (${next})`)) next += 1;
      return `${defaultName} (${next})`;
    },
    [treeFolders],
  );

  const cardSetsByFolderId = useMemo(() => {
    const map = new Map<string, CardSet[]>();
    for (const cs of cardSets) {
      if ((cs as unknown as { isDeleted?: boolean }).isDeleted) continue;
      const key = normalizeFolderId(cs.folderId);
      const list = map.get(key);
      if (list) list.push(cs);
      else map.set(key, [cs]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }
    return map;
  }, [cardSets]);

  const getCardSets = useCallback(
    (folderId: string | null): CardSet[] =>
      cardSetsByFolderId.get(normalizeFolderId(folderId)) ?? [],
    [cardSetsByFolderId],
  );

  const itemsByCardSetId = useMemo(() => {
    const map = new Map<string, ExplorerItem[]>();
    if (cardSets.length === 0) return map;
    for (const card of treeCards) {
      if (isSoftDeleted(withLegacy(card))) continue;
      const csId = card.cardSetId ?? withLegacy(card).card_set_id;
      if (!csId) continue;
      const list = map.get(csId);
      const item: ExplorerItem = { type: "card", data: card };
      if (list) list.push(item);
      else map.set(csId, [item]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const orderA = withLegacy(a.data).orderIndex ?? Number.MAX_SAFE_INTEGER;
        const orderB = withLegacy(b.data).orderIndex ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    }
    return map;
  }, [cardSets, treeCards]);

  const getCardSetItems = useCallback(
    (cardSetId: string): ExplorerItem[] =>
      itemsByCardSetId.get(cardSetId) ?? [],
    [itemsByCardSetId],
  );

  return {
    childFoldersByParentId,
    rootFolders,
    getChildFolders,
    visibleFolderIdSet,
    resolveTreeFolderId,
    hasValidFolderBinding,
    directCardCountByFolderId,
    itemsByFolderId,
    getFolderItems,
    getCardSets,
    getCardSetItems,
    matchCountMap,
    deleteTargetCounts,
    getNextOrderIndex,
    getUniqueFolderName,
  };
};
