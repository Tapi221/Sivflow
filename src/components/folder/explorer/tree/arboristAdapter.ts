import {
  toVirtualMfCardDisplayName,
  toVirtualMfDeckDisplayName,
} from "@/features/fileDisplay/virtualFileExtensions";
import type {
  Card,
  CardSet,
  DocumentItem,
  ExplorerItem,
  SelectedExplorerItem,
} from "@/types";

export type ExplorerTreeNodeType = "folder" | "cardSet" | "card" | "document";

export interface ExplorerTreeNode {
  id: string;
  type: ExplorerTreeNodeType;
  name: string;
  children?: ExplorerTreeNode[];
  folderId?: string | null;
  data?: unknown;
}

interface BuildExplorerTreeDataParams {
  rootFolders: unknown[];
  rootItems: ExplorerItem[];
  getChildFolders: (folderId: string) => unknown[];
  getFolderItems: (folderId: string | null) => ExplorerItem[];
  getCardSets: (folderId: string | null) => CardSet[];
  getCardSetItems: (cardSetId: string) => ExplorerItem[];
  isFiltering: boolean;
  matchCountMap: Map<string, number>;
  getFolderId: (folder: unknown) => string | null;
}

export const toTreeId = (type: ExplorerTreeNodeType, id: string): string =>
  `${type}:${id}`;

export const parseSelectedTreeId = (
  treeId: string | null | undefined,
): { type: ExplorerTreeNodeType; id: string } | null => {
  if (!treeId) return null;

  const [type, ...rest] = treeId.split(":");
  const id = rest.join(":");

  if (!id) return null;

  if (
    type !== "folder" &&
    type !== "cardSet" &&
    type !== "card" &&
    type !== "document"
  ) {
    return null;
  }

  return { type, id };
};

const getFolderName = (folder: unknown): string => {
  const value = folder as {
    folderName?: string;
    folder_name?: string;
    name?: string;
  };

  return (
    value.folderName?.trim() ||
    value.folder_name?.trim() ||
    value.name?.trim() ||
    "無題のフォルダ"
  );
};

const getItemNode = (item: ExplorerItem): ExplorerTreeNode | null => {
  if (item.type === "document") {
    const document = item.data as DocumentItem;

    return {
      id: toTreeId("document", document.id),
      type: "document",
      name:
        document.title?.trim() ||
        document.fileName?.trim() ||
        "無題の文書",
      data: document,
    };
  }

  const card = item.data as Card;

  return {
    id: toTreeId("card", card.id),
    type: "card",
    name: toVirtualMfCardDisplayName(
      card.title?.trim() || card.questionNumber?.trim() || "無題のカード",
    ),
    data: card,
  };
};

export const buildExplorerTreeData = ({
  rootFolders,
  rootItems,
  getChildFolders,
  getFolderItems,
  getCardSets,
  getCardSetItems,
  isFiltering,
  matchCountMap,
  getFolderId,
}: BuildExplorerTreeDataParams): ExplorerTreeNode[] => {
  const buildFolderNode = (folder: unknown): ExplorerTreeNode | null => {
    const folderId = getFolderId(folder);
    if (!folderId) return null;

    if (isFiltering && (matchCountMap.get(folderId) ?? 0) <= 0) {
      return null;
    }

    const childFolders = getChildFolders(folderId)
      .map(buildFolderNode)
      .filter((node): node is ExplorerTreeNode => node !== null);

    const cardSetNodes = getCardSets(folderId).map((cardSet) => ({
      id: toTreeId("cardSet", cardSet.id),
      type: "cardSet" as const,
      name: toVirtualMfDeckDisplayName(cardSet.name?.trim() || "無題のセット"),
      folderId,
      data: cardSet,
      children: getCardSetItems(cardSet.id)
        .map(getItemNode)
        .filter((node): node is ExplorerTreeNode => node !== null),
    }));

    const itemNodes = getFolderItems(folderId)
      .map(getItemNode)
      .filter((node): node is ExplorerTreeNode => node !== null);

    return {
      id: toTreeId("folder", folderId),
      type: "folder",
      name: getFolderName(folder),
      folderId,
      data: folder,
      children: [...childFolders, ...cardSetNodes, ...itemNodes],
    };
  };

  const folderNodes = rootFolders
    .map(buildFolderNode)
    .filter((node): node is ExplorerTreeNode => node !== null);

  const rootCardSetNodes = getCardSets(null).map((cardSet) => ({
    id: toTreeId("cardSet", cardSet.id),
    type: "cardSet" as const,
    name: toVirtualMfDeckDisplayName(cardSet.name?.trim() || "無題のセット"),
    folderId: null,
    data: cardSet,
    children: getCardSetItems(cardSet.id)
      .map(getItemNode)
      .filter((node): node is ExplorerTreeNode => node !== null),
  }));

  const rootItemNodes = rootItems
    .map(getItemNode)
    .filter((node): node is ExplorerTreeNode => node !== null);

  return [...folderNodes, ...rootCardSetNodes, ...rootItemNodes];
};

export const toExpandedTreeIds = (
  expandedFolderIds: Iterable<string>,
  expandedCardSetIds: Iterable<string> = [],
): string[] => [
  ...Array.from(expandedFolderIds, (id) => toTreeId("folder", id)),
  ...Array.from(expandedCardSetIds, (id) => toTreeId("cardSet", id)),
];

export const toSelectedTreeId = (
  selectedFolderId: string | null,
  selectedItem: SelectedExplorerItem,
  selectedCardSetId?: string | null,
): string | null => {
  if (selectedItem?.type === "card") return toTreeId("card", selectedItem.id);
  if (selectedItem?.type === "cardSet") return toTreeId("cardSet", selectedItem.id);
  if (selectedItem?.type === "document") return toTreeId("document", selectedItem.id);
  if (selectedCardSetId) return toTreeId("cardSet", selectedCardSetId);
  if (selectedFolderId) return toTreeId("folder", selectedFolderId);

  return null;
};
