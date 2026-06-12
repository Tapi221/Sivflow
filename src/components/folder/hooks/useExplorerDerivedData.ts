import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { getEntityTime, getFolderId, getParentFolderId, isSameFolder, normalizeFolderId, ROOT_FOLDER_ID } from "@/components/folder/explorer/model/utils";
import { buildCardSetById, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import { useDocumentCommands } from "@/features/document/hooks/useDocumentCommands";
import { compareOrderableEntities } from "@/lib/orderableEntity";
import type { Card, CardSet, DocumentItem, ExplorerItem, Note } from "@/types";



type LegacyEntityFields = {
  isDeleted?: boolean; is_deleted?: boolean; folder_id?: string | null; card_set_id?: string | null; orderIndex?: number; order_index?: number; };
type DraftFolderFields = {
  __draft?: boolean; __optimistic?: boolean; };
interface Params {
  treeFolders: FolderTreeNode[];
  treeCards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  notes?: Note[];
  isFiltering: boolean;
}



const ORPHAN_DOCUMENT_CLEANUP_LOG_PREFIX = "[useExplorerDerivedData] orphan PDF purge";



const isSoftDeleted = (entity?: { isDeleted?: boolean; is_deleted?: boolean; } | null) => Boolean(entity?.isDeleted ?? entity?.is_deleted);
const isDraftFolder = (folder: FolderTreeNode) => {
  const draftFolder = folder as FolderTreeNode & DraftFolderFields;
  return Boolean(draftFolder.__draft || draftFolder.__optimistic);
};
const withLegacy = <T extends object>(v: T): T & LegacyEntityFields => v as T & LegacyEntityFields;
const getCardSetFolderId = (cardSet: CardSet): string | null | undefined => cardSet.folderId ?? withLegacy(cardSet).folder_id;
const getDocumentFolderId = (document: DocumentItem): string | null | undefined => document.folderId ?? withLegacy(document).folder_id;
const getNoteFolderId = (note: Note): string | null | undefined => note.folderId ?? withLegacy(note).folder_id;
const getOrderIndex = (entity: object, fallback = Number.MAX_SAFE_INTEGER): number => withLegacy(entity).orderIndex ?? withLegacy(entity).order_index ?? fallback;
const getFolderOrder = (folder: FolderTreeNode) => {
  return ((folder as { orderIndex?: number; order_index?: number; }).orderIndex ?? (folder as { orderIndex?: number; order_index?: number; }).order_index ?? 0) as number;
};
const getFolderName = (folder: FolderTreeNode) => {
  return String((folder as { folderName?: string; folder_name?: string; }).folderName ?? (folder as { folderName?: string; folder_name?: string; }).folder_name ?? "");
};
const compareFolders = (a: FolderTreeNode, b: FolderTreeNode) => {
  return compareOrderableEntities(a, b, {
    getOrderIndex: getFolderOrder,
    getUpdatedAt: (folder) => getEntityTime((folder as { updatedAt?: unknown; }).updatedAt),
    getCreatedAt: (folder) => getEntityTime((folder as { createdAt?: unknown; }).createdAt),
    getName: getFolderName,
    getId: getFolderId,
  });
};
const isOrphanDocument = (document: DocumentItem, visibleFolderIdSet: Set<string>): boolean => {
  if (document.kind !== "pdf") return false;
  if (isSoftDeleted(withLegacy(document))) return false;
  const normalizedFolderId = normalizeFolderId(getDocumentFolderId(document));
  if (normalizedFolderId === ROOT_FOLDER_ID) return true;
  return !visibleFolderIdSet.has(normalizedFolderId);
};
const useExplorerDerivedData = ({ treeFolders, treeCards, cardSets = [], documents, notes = [], isFiltering }: Params) => {
  const { purgeDocument } = useDocumentCommands();
  const orphanCleanupInFlightRef = useRef<Set<string>>(new Set());

  const cardSetById = useMemo(() => {
    const activeCardSets = cardSets.filter((cardSet) => !isSoftDeleted(withLegacy(cardSet)));
    return buildCardSetById(activeCardSets);
  }, [cardSets]);

  const visibleFolderIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const folder of treeFolders) {
      if (isSoftDeleted(folder)) continue;
      const id = getFolderId(folder);
      if (id) set.add(id);
    }
    return set;
  }, [treeFolders]);

  const orphanDocumentIds = useMemo(() => {
    if (visibleFolderIdSet.size === 0) return [];
    return documents.filter((document) => isOrphanDocument(document, visibleFolderIdSet)).map((document) => document.id);
  }, [documents, visibleFolderIdSet]);

  useEffect(() => {
    if (orphanDocumentIds.length === 0) return;
    let isCancelled = false;

    void (async () => {
      for (const documentId of orphanDocumentIds) {
        if (isCancelled) return;
        if (orphanCleanupInFlightRef.current.has(documentId)) continue;
        orphanCleanupInFlightRef.current.add(documentId);
        try {
          await purgeDocument(documentId);
        } catch (error) {
          orphanCleanupInFlightRef.current.delete(documentId);
          console.error(`${ORPHAN_DOCUMENT_CLEANUP_LOG_PREFIX} failed`, { documentId, error });
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [orphanDocumentIds, purgeDocument]);

  const childFoldersByParentId = useMemo(() => {
    const map = new Map<string, FolderTreeNode[]>();
    for (const folder of treeFolders) {
      if (isSoftDeleted(folder)) continue;
      const folderId = getFolderId(folder);
      if (!folderId) continue;

      const rawParentId = normalizeFolderId(getParentFolderId(folder));
      const parentId = rawParentId !== ROOT_FOLDER_ID && !visibleFolderIdSet.has(rawParentId) ? ROOT_FOLDER_ID : rawParentId;
      const siblings = map.get(parentId);
      if (siblings) siblings.push(folder);
      else map.set(parentId, [folder]);
    }
    for (const siblings of map.values()) siblings.sort(compareFolders);
    return map;
  }, [treeFolders, visibleFolderIdSet]);

  const rootFolders = useMemo(() => childFoldersByParentId.get(ROOT_FOLDER_ID) ?? [], [childFoldersByParentId]);

  const getChildFolders = useCallback((parentId: string) => childFoldersByParentId.get(parentId) ?? [], [childFoldersByParentId]);

  const resolveTreeFolderId = useCallback((folderId: string | null | undefined) => {
    const normalized = normalizeFolderId(folderId);
    if (normalized === ROOT_FOLDER_ID) return ROOT_FOLDER_ID;
    return visibleFolderIdSet.has(normalized) ? normalized : ROOT_FOLDER_ID;
  }, [visibleFolderIdSet]);

  const hasValidFolderBinding = useCallback((folderId: string | null | undefined) => {
    const normalized = normalizeFolderId(folderId);
    if (normalized === ROOT_FOLDER_ID) return false;
    return visibleFolderIdSet.has(normalized);
  }, [visibleFolderIdSet]);

  const directCardCountByFolderId = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of treeCards) {
      if (isSoftDeleted(withLegacy(card))) continue;
      const cardFolderId = resolveCardFolderIdStrict(card, cardSetById);
      if (!hasValidFolderBinding(cardFolderId)) continue;
      const folderId = resolveTreeFolderId(cardFolderId);
      map.set(folderId, (map.get(folderId) ?? 0) + 1);
    }
    return map;
  }, [treeCards, resolveTreeFolderId, hasValidFolderBinding, cardSetById]);

  const itemsByFolderId = useMemo(() => {
    const map = new Map<string, ExplorerItem[]>();
    const pushItem = (folderId: string | null | undefined, item: ExplorerItem) => {
      const key = normalizeFolderId(folderId);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    };

    for (const card of treeCards) {
      if (isSoftDeleted(withLegacy(card))) continue;
      const cardFolderId = resolveCardFolderIdStrict(card, cardSetById);
      if (!hasValidFolderBinding(cardFolderId)) continue;
      pushItem(resolveTreeFolderId(cardFolderId), { type: "card", data: card });
    }

    for (const doc of documents) {
      if (doc.kind !== "pdf") continue;
      if (isSoftDeleted(withLegacy(doc))) continue;
      if (!hasValidFolderBinding(getDocumentFolderId(doc))) continue;
      pushItem(resolveTreeFolderId(getDocumentFolderId(doc)), { type: "document", data: doc });
    }

    for (const note of notes) {
      if (isSoftDeleted(withLegacy(note))) continue;
      if (!hasValidFolderBinding(getNoteFolderId(note))) continue;
      pushItem(resolveTreeFolderId(getNoteFolderId(note)), { type: "note", data: note });
    }

    for (const list of map.values()) {
      list.sort((a, b) => {
        const orderA = getOrderIndex(a.data);
        const orderB = getOrderIndex(b.data);
        if (orderA !== orderB) return orderA - orderB;
        const timeA = getEntityTime((a.data as { updatedAt?: unknown; }).updatedAt);
        const timeB = getEntityTime((b.data as { updatedAt?: unknown; }).updatedAt);
        return timeB - timeA;
      });
    }
    return map;
  }, [treeCards, documents, notes, resolveTreeFolderId, hasValidFolderBinding, cardSetById]);

  const getFolderItems = useCallback((folderId: string | null): ExplorerItem[] => itemsByFolderId.get(normalizeFolderId(folderId)) ?? [], [itemsByFolderId]);

  const matchCountMap = useMemo(() => {
    if (!isFiltering) return new Map<string, number>();

    const draftFolderIdSet = new Set<string>();
    for (const folder of treeFolders) {
      const folderId = getFolderId(folder);
      if (folderId && isDraftFolder(folder)) draftFolderIdSet.add(folderId);
    }

    const map = new Map<string, number>();
    const calc = (folderId: string): number => {
      if (map.has(folderId)) return map.get(folderId)!;
      const directCount = getFolderItems(folderId).length;
      const children = getChildFolders(folderId);
      const childCount = children.reduce((acc, child) => acc + calc(getFolderId(child)), 0);
      const total = directCount + childCount;
      const visibleTotal = draftFolderIdSet.has(folderId) ? Math.max(total, 1) : total;
      map.set(folderId, visibleTotal);
      return visibleTotal;
    };
    for (const folder of treeFolders) {
      const folderId = getFolderId(folder);
      if (!map.has(folderId)) calc(folderId);
    }
    return map;
  }, [isFiltering, treeFolders, getFolderItems, getChildFolders]);

  const deleteTargetCounts = useCallback((deleteTargetFolderId: string | null) => {
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
  }, [directCardCountByFolderId, childFoldersByParentId]);

  const getNextOrderIndex = useCallback((folderId: string | null, resolvedFolderId?: string) => {
    const targetFolderId = resolvedFolderId ?? resolveTreeFolderId(folderId);
    let maxOrder = -1;
    for (const card of treeCards) {
      if (isSoftDeleted(withLegacy(card))) continue;
      const cardFolderId = resolveTreeFolderId(resolveCardFolderIdStrict(card, cardSetById));
      if (!isSameFolder(cardFolderId, targetFolderId)) continue;
      const order = getOrderIndex(card, -1);
      if (order > maxOrder) maxOrder = order;
    }
    for (const doc of documents) {
      if (isSoftDeleted(withLegacy(doc))) continue;
      const docFolderId = resolveTreeFolderId(getDocumentFolderId(doc));
      if (!isSameFolder(docFolderId, targetFolderId)) continue;
      const order = getOrderIndex(doc, -1);
      if (order > maxOrder) maxOrder = order;
    }
    for (const note of notes) {
      if (isSoftDeleted(withLegacy(note))) continue;
      const noteFolderId = resolveTreeFolderId(getNoteFolderId(note));
      if (!isSameFolder(noteFolderId, targetFolderId)) continue;
      const order = getOrderIndex(note, -1);
      if (order > maxOrder) maxOrder = order;
    }
    return maxOrder + 1;
  }, [treeCards, documents, notes, resolveTreeFolderId, cardSetById]);

  const cardSetsByFolderId = useMemo(() => {
    const map = new Map<string, CardSet[]>();
    for (const cs of cardSets) {
      if (isSoftDeleted(withLegacy(cs))) continue;
      const key = normalizeFolderId(getCardSetFolderId(cs));
      const list = map.get(key);
      if (list) list.push(cs);
      else map.set(key, [cs]);
    }
    for (const list of map.values()) list.sort((a, b) => getOrderIndex(a, 0) - getOrderIndex(b, 0));
    return map;
  }, [cardSets]);

  const getCardSets = useCallback((folderId: string | null): CardSet[] => cardSetsByFolderId.get(normalizeFolderId(folderId)) ?? [], [cardSetsByFolderId]);

  const folderContentCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    const visiting = new Set<string>();

    const countFolderContent = (folderId: string): number => {
      const cached = counts.get(folderId);
      if (cached !== undefined) return cached;
      if (visiting.has(folderId)) return 0;
      visiting.add(folderId);

      const itemCount = getFolderItems(folderId).filter((item) => item.type === "document" || item.type === "note").length;
      const cardSetCount = getCardSets(folderId).length;
      const childFolderContentCount = getChildFolders(folderId).reduce((total, childFolder) => {
        const childFolderId = getFolderId(childFolder);
        return childFolderId ? total + countFolderContent(childFolderId) : total;
      }, 0);
      const total = itemCount + cardSetCount + childFolderContentCount;

      counts.set(folderId, total);
      visiting.delete(folderId);
      return total;
    };

    for (const folder of treeFolders) {
      const folderId = getFolderId(folder);
      if (folderId) countFolderContent(folderId);
    }

    return counts;
  }, [getCardSets, getChildFolders, getFolderItems, treeFolders]);

  const getFolderContentCount = useCallback((folderId: string | null): number => {
    if (!folderId) return 0;
    return folderContentCountMap.get(folderId) ?? 0;
  }, [folderContentCountMap]);

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
        const orderA = getOrderIndex(a.data);
        const orderB = getOrderIndex(b.data);
        return orderA - orderB;
      });
    }
    return map;
  }, [cardSets, treeCards]);

  const getCardSetItems = useCallback((cardSetId: string): ExplorerItem[] => itemsByCardSetId.get(cardSetId) ?? [], [itemsByCardSetId]);

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
    folderContentCountMap,
    getFolderContentCount,
    matchCountMap,
    deleteTargetCounts,
    getNextOrderIndex,
  };
};



export { useExplorerDerivedData };
