import {
  getEntityTime,
  getFolderId,
  getParentFolderId,
  normalizeFolderId,
  type FolderTreeNode,
} from "@/components/folder/explorer/model/utils";
import { toVirtualMfDeckDisplayName } from "@/features/fileDisplay/virtualFileExtensions";
import type {
  Card,
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";

export type ExplorerDetailRowKind = "folder" | "cardSet" | "document";

export type ExplorerDetailRow = {
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
};

type BuildExplorerDetailRowsParams = {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  currentFolderId: string | null;
};

type LegacyEntityFields = {
  folder_id?: string | null;
  parent_folder_id?: string | null;
  folder_name?: string | null;
  order_index?: number;
  is_deleted?: boolean;
  is_hidden?: boolean;
  tags?: string[];
};

const EXPLORER_ROOT_PATH_SEGMENTS = ["ホーム", "エクスプローラー"];

const withLegacy = <TEntity extends object>(
  entity: TEntity,
): TEntity & LegacyEntityFields => {
  return entity as TEntity & LegacyEntityFields;
};

const isSoftDeleted = (
  entity?: { isDeleted?: boolean; is_deleted?: boolean } | null,
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
  return folderLike.orderIndex ?? folderLike.order_index ?? Number.MAX_SAFE_INTEGER;
};

const getCardSetFolderId = (cardSet: CardSet): string | null => {
  return cardSet.folderId ?? withLegacy(cardSet).folder_id ?? null;
};

const getDocumentFolderId = (document: DocumentItem): string | null => {
  return document.folderId ?? withLegacy(document).folder_id ?? null;
};

const getDocumentDisplayName = (document: DocumentItem): string => {
  return document.title?.trim() || document.fileName?.trim() || "無題の文書";
};

const getDocumentTags = (document: DocumentItem): string[] => {
  return Array.isArray(document.tags) ? document.tags : [];
};

const getCardCardSetId = (card: Card): string | null => {
  return card.cardSetId ?? withLegacy(card).card_set_id ?? null;
};

const buildFolderById = (folders: Folder[]): Map<string, Folder> => {
  const map = new Map<string, Folder>();

  folders.forEach((folder) => {
    const folderId = getFolderId(folder);
    if (!folderId || isSoftDeleted(withLegacy(folder)) || isHiddenFolder(folder)) {
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
    document: 2,
  };

  return [...rows].sort((left, right) => {
    const groupCompare = kindOrder[left.kind] - kindOrder[right.kind];
    if (groupCompare !== 0) return groupCompare;
    return compareDetailRowsWithinKind(left, right);
  });
};

export const buildExplorerDetailRows = ({
  folders,
  cards,
  cardSets,
  documents,
  currentFolderId,
}: BuildExplorerDetailRowsParams): ExplorerDetailRow[] => {
  const folderById = buildFolderById(folders);
  const currentFolderKey = normalizeFolderId(currentFolderId);
  const currentPathSegments = [
    ...EXPLORER_ROOT_PATH_SEGMENTS,
    ...buildFolderPathSegments(currentFolderId, folderById),
  ];

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

  const folderRows = folders
    .filter((folder) => {
      const folderId = getFolderId(folder);
      if (!folderId || isSoftDeleted(withLegacy(folder)) || isHiddenFolder(folder)) {
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
        tags: [],
        path: joinExplorerPath([...currentPathSegments, folderName]),
        updatedAt: folder.updatedAt,
        updatedAtMs: getEntityTime(folder.updatedAt),
        typeLabel: "フォルダー",
        sizeBytes: null,
        orderIndex: getFolderOrderIndex(folder),
        selectTarget: null,
        openFolderId: folderId,
      };
    });

  const cardSetRows = cardSets
    .filter((cardSet) => {
      if (isSoftDeleted(cardSet)) return false;
      return normalizeFolderId(getCardSetFolderId(cardSet)) === currentFolderKey;
    })
    .map((cardSet): ExplorerDetailRow => {
      const cardSetName = toVirtualMfDeckDisplayName(
        cardSet.name?.trim() || "無題のセット",
      );
      const cardCount = cardCountByCardSetId.get(cardSet.id) ?? 0;

      return {
        key: `cardSet:${cardSet.id}`,
        kind: "cardSet",
        id: cardSet.id,
        name: cardSetName,
        tags: cardCount > 0 ? [`${cardCount}枚`] : [],
        path: joinExplorerPath(currentPathSegments),
        updatedAt: cardSet.updatedAt,
        updatedAtMs: getEntityTime(cardSet.updatedAt),
        typeLabel: "カードセット",
        sizeBytes: null,
        orderIndex: cardSet.orderIndex ?? Number.MAX_SAFE_INTEGER,
        selectTarget: { type: "cardSet", id: cardSet.id },
        openFolderId: null,
      };
    });

  const documentRows = documents
    .filter((document) => {
      if (document.kind !== "pdf" || isSoftDeleted(withLegacy(document))) {
        return false;
      }

      return normalizeFolderId(getDocumentFolderId(document)) === currentFolderKey;
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
      };
    });

  return groupRows([...folderRows, ...cardSetRows, ...documentRows]);
};
