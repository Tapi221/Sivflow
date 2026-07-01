import type { FolderTreeNode } from "./utils";
import { getEntityTime, getFolderId, getParentFolderId, normalizeFolderId } from "./utils";
import { toVirtualMfCardDisplayName, toVirtualMfDeckDisplayName } from "@/features/fileDisplay/virtualFileExtensions";
import type { Card, CardSet, DocumentItem, Folder, SelectedExplorerItem, SyncEntity } from "@/types";



type ExplorerDetailRowKind = "folder" | "cardSet" | "card" | "document";
type ExplorerDetailLocalSyncState = | "pending" | "synced" | "error" | "conflict";
type ExplorerDetailRow = {
  key: string;
  kind: ExplorerDetailRowKind;
  id: string;
  name: string;
  tags: string[];
  path: string;
  updatedAt: unknown;
  updatedAtMs: number;
  typeLabel: string;
  sizeBytes: number | null;
  orderIndex: number;
  selectTarget: SelectedExplorerItem;
  openFolderId: string | null;
  openCardSetId: string | null;
  syncEntity: Extract<SyncEntity, "folder" | "cardSet" | "card" | "document">;
  syncTargetId: string;
  localSyncState?: ExplorerDetailLocalSyncState;
  lastSyncedAt?: unknown;
};
type BuildExplorerDetailRowsParams = {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  currentFolderId: string | null;
  currentCardSetId?: string | null;
};
type LegacyEntityFields = {
  folder_id?: string | null;
  parent_folder_id?: string | null;
  folder_name?: string | null;
  order_index?: number;
  is_deleted?: boolean;
  is_hidden?: boolean;
  tags?: string[];
  tagIds?: string[];
  tag_ids?: string[];
  card_set_id?: string | null;
};



const EXPLORER_ROOT_PATH_SEGMENTS = ["ホーム", "エクスプローラー"];



const withLegacy = <TEntity extends object>(
  entity: TEntity,
): TEntity & LegacyEntityFields => {
  return entity as TEntity & LegacyEntityFields;
};
const isSoftDeleted = (
  entity?: { isDeleted?: boolean; is_deleted?: boolean; } | null,
): boolean => {
  return Boolean(entity?.isDeleted ?? entity?.is_deleted);
};
const isHiddenFolder = (folder: FolderTreeNode): boolean => {
  return Boolean(folder.isHidden ?? folder.is_hidden);
};
const getFolderName = (folder: Folder | FolderTreeNode): string => {
  const folderLike = folder as FolderTreeNode;
  return folderLike.folderName ?? folderLike.folder_name ?? "無題のフォルダ";
};
const getFolderOrderIndex = (folder: Folder | FolderTreeNode): number => {
  const folderLike = folder as FolderTreeNode;
  return (
    folderLike.orderIndex ?? folderLike.order_index ?? Number.MAX_SAFE_INTEGER
  );
};
const getCardSetFolderId = (cardSet: CardSet): string | null => {
  return cardSet.folderId ?? withLegacy(cardSet).folder_id ?? null;
};
const getDocumentFolderId = (document: DocumentItem): string | null => {
  return document.folderId ?? withLegacy(document).folder_id ?? null;
};
const getDocumentDisplayName = (document: DocumentItem): string => {
  return (document.title?.trim() || document.fileName?.trim()) ?? "無題の文書";
};
const getStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
};
const getEntityTags = (entity: object): string[] => {
  const legacy = withLegacy(entity);
  return getStringArray(legacy.tags ?? legacy.tagIds ?? legacy.tag_ids);
};
const getDocumentTags = (document: DocumentItem): string[] => {
  return getStringArray(document.tags);
};
const getCardCardSetId = (card: Card): string | null => {
  return card.cardSetId ?? withLegacy(card).card_set_id ?? null;
};
const getCardDisplayName = (card: Card): string => {
  return toVirtualMfCardDisplayName(
    (card.title?.trim() || card.questionNumber?.trim()) ?? "無題のカード",
  );
};
const getCardTags = (card: Card): string[] => {
  return getStringArray(card.tagIds);
};
const getCardLocalSyncState = (
  card: Card,
): ExplorerDetailLocalSyncState | undefined => {
  const value = card.syncState;
  if (
    value === "pending" ||
    value === "synced" ||
    value === "error" ||
    value === "conflict"
  ) {
    return value;
  }

  return undefined;
};
const buildFolderById = (folders: Folder[]): Map<string, Folder> => {
  const map = new Map<string, Folder>();

  folders.forEach((folder) => {
    const folderId = getFolderId(folder);
    if (
      !folderId ||
      isSoftDeleted(withLegacy(folder)) ||
      isHiddenFolder(folder)
    ) {
      return;
    }

    map.set(folderId, folder);
  });

  return map;
};
const buildFolderPathSegments = (
  folderId: string | null,
  folderById: Map<string, Folder>,
): string[] => {
  if (!folderId) return [];

  const segments: string[] = [];
  const seenFolderIds = new Set<string>();
  let currentFolderId: string | null = folderId;

  while (currentFolderId && !seenFolderIds.has(currentFolderId)) {
    const folder = folderById.get(currentFolderId);
    if (!folder) break;

    segments.unshift(getFolderName(folder));
    seenFolderIds.add(currentFolderId);
    currentFolderId = getParentFolderId(folder);
  }

  return segments;
};
const joinExplorerPath = (segments: string[]): string => {
  return segments.join("/");
};
const compareDetailRowsWithinKind = (
  left: ExplorerDetailRow,
  right: ExplorerDetailRow,
): number => {
  if (left.orderIndex !== right.orderIndex) {
    return left.orderIndex - right.orderIndex;
  }

  if (left.updatedAtMs !== right.updatedAtMs) {
    return right.updatedAtMs - left.updatedAtMs;
  }

  const nameCompare = left.name.localeCompare(right.name, "ja");
  if (nameCompare !== 0) return nameCompare;

  return left.id.localeCompare(right.id);
};
const groupRows = (rows: ExplorerDetailRow[]): ExplorerDetailRow[] => {
  const kindOrder: Record<ExplorerDetailRowKind, number> = {
    folder: 0,
    cardSet: 1,
    card: 2,
    document: 3,
  };

  return [...rows].sort((left, right) => {
    const groupCompare = kindOrder[left.kind] - kindOrder[right.kind];
    if (groupCompare !== 0) return groupCompare;
    return compareDetailRowsWithinKind(left, right);
  });
};
const buildCardSetRows = ({
  cardSets,
  cards,
  currentFolderKey,
  currentPathSegments,
}: {
  cardSets: CardSet[];
  cards: Card[];
  currentFolderKey: string;
  currentPathSegments: string[];
}): ExplorerDetailRow[] => {
  const cardCountByCardSetId = new Map<string, number>();

  cards.forEach((card) => {
    if (isSoftDeleted(withLegacy(card))) return;

    const cardSetId = getCardCardSetId(card);
    if (!cardSetId) return;

    cardCountByCardSetId.set(
      cardSetId,
      (cardCountByCardSetId.get(cardSetId) ?? 0) + 1,
    );
  });

  return cardSets
    .filter((cardSet) => {
      if (isSoftDeleted(cardSet)) return false;
      return (
        normalizeFolderId(getCardSetFolderId(cardSet)) === currentFolderKey
      );
    })
    .map((cardSet): ExplorerDetailRow => {
      const cardSetName = toVirtualMfDeckDisplayName(
        cardSet.name?.trim() ?? "無題のセット",
      );

      return {
        key: `cardSet:${cardSet.id}`,
        kind: "cardSet",
        id: cardSet.id,
        name: cardSetName,
        tags: getEntityTags(cardSet),
        path: joinExplorerPath(currentPathSegments),
        updatedAt: cardSet.updatedAt,
        updatedAtMs: getEntityTime(cardSet.updatedAt),
        typeLabel: "カードセット",
        sizeBytes: null,
        orderIndex: cardSet.orderIndex ?? Number.MAX_SAFE_INTEGER,
        selectTarget: null,
        openFolderId: null,
        openCardSetId: cardSet.id,
        syncEntity: "cardSet",
        syncTargetId: cardSet.id,
      };
    });
};
const buildCardRows = ({
  cards,
  cardSet,
  folderById,
}: {
  cards: Card[];
  cardSet: CardSet;
  folderById: Map<string, Folder>;
}): ExplorerDetailRow[] => {
  const cardSetName = toVirtualMfDeckDisplayName(
    cardSet.name?.trim() ?? "無題のセット",
  );
  const cardSetPathSegments = [
    ...EXPLORER_ROOT_PATH_SEGMENTS,
    ...buildFolderPathSegments(getCardSetFolderId(cardSet), folderById),
    cardSetName,
  ];

  return cards
    .filter((card) => {
      if (isSoftDeleted(withLegacy(card))) return false;
      return getCardCardSetId(card) === cardSet.id;
    })
    .map((card): ExplorerDetailRow => {
      return {
        key: `card:${card.id}`,
        kind: "card",
        id: card.id,
        name: getCardDisplayName(card),
        tags: getCardTags(card),
        path: joinExplorerPath(cardSetPathSegments),
        updatedAt: card.updatedAt,
        updatedAtMs: getEntityTime(card.updatedAt),
        typeLabel: "カード",
        sizeBytes: null,
        orderIndex: card.orderIndex ?? Number.MAX_SAFE_INTEGER,
        selectTarget: { type: "card", id: card.id },
        openFolderId: null,
        openCardSetId: null,
        syncEntity: "card",
        syncTargetId: card.id,
        localSyncState: getCardLocalSyncState(card),
        lastSyncedAt: card.lastSyncedAt,
      };
    })
    .sort(compareDetailRowsWithinKind);
};
const buildExplorerDetailRows = ({ folders, cards, cardSets, documents, currentFolderId, currentCardSetId = null }: BuildExplorerDetailRowsParams): ExplorerDetailRow[] => {
  const folderById = buildFolderById(folders);
  const activeCardSet = currentCardSetId
    ? (cardSets.find((cardSet) => cardSet.id === currentCardSetId) ?? null)
    : null;

  if (activeCardSet) {
    return buildCardRows({ cards, cardSet: activeCardSet, folderById });
  }

  const currentFolderKey = normalizeFolderId(currentFolderId);
  const currentPathSegments = [
    ...EXPLORER_ROOT_PATH_SEGMENTS,
    ...buildFolderPathSegments(currentFolderId, folderById),
  ];

  const folderRows = folders
    .filter((folder) => {
      const folderId = getFolderId(folder);
      if (
        !folderId ||
        isSoftDeleted(withLegacy(folder)) ||
        isHiddenFolder(folder)
      ) {
        return false;
      }

      return normalizeFolderId(getParentFolderId(folder)) === currentFolderKey;
    })
    .map((folder): ExplorerDetailRow => {
      const folderId = getFolderId(folder);
      const folderName = getFolderName(folder);

      return {
        key: `folder:${folderId}`,
        kind: "folder",
        id: folderId,
        name: folderName,
        tags: getEntityTags(folder),
        path: joinExplorerPath([...currentPathSegments, folderName]),
        updatedAt: folder.updatedAt,
        updatedAtMs: getEntityTime(folder.updatedAt),
        typeLabel: "フォルダー",
        sizeBytes: null,
        orderIndex: getFolderOrderIndex(folder),
        selectTarget: null,
        openFolderId: folderId,
        openCardSetId: null,
        syncEntity: "folder",
        syncTargetId: folderId,
      };
    });

  const cardSetRows = buildCardSetRows({
    cardSets,
    cards,
    currentFolderKey,
    currentPathSegments,
  });

  const documentRows = documents
    .filter((document) => {
      if (document.kind !== "pdf" || isSoftDeleted(withLegacy(document))) {
        return false;
      }

      return (
        normalizeFolderId(getDocumentFolderId(document)) === currentFolderKey
      );
    })
    .map((document): ExplorerDetailRow => {
      return {
        key: `document:${document.id}`,
        kind: "document",
        id: document.id,
        name: getDocumentDisplayName(document),
        tags: getDocumentTags(document),
        path: joinExplorerPath(currentPathSegments),
        updatedAt: document.updatedAt,
        updatedAtMs: getEntityTime(document.updatedAt),
        typeLabel: "PDF",
        sizeBytes: document.sizeBytes,
        orderIndex: document.orderIndex ?? Number.MAX_SAFE_INTEGER,
        selectTarget: { type: "document", id: document.id },
        openFolderId: null,
        openCardSetId: null,
        syncEntity: "document",
        syncTargetId: document.id,
      };
    });

  return groupRows([...folderRows, ...cardSetRows, ...documentRows]);
};



export { buildExplorerDetailRows };


export type { ExplorerDetailRowKind, ExplorerDetailLocalSyncState, ExplorerDetailRow };
