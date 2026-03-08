import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import type { FolderTreeArboristNode } from "@/components/sidebar/FolderTreeArborist";
import type {
    Card,
    DocumentItem,
    ExplorerItem,
    SelectedExplorerItem,
} from "@/types";

export type ExplorerTreeNode = FolderTreeArboristNode & {
  kind: "folder" | "card" | "document";
  rawId: string;
  folder?: FolderTreeNode;
  card?: Card;
  document?: DocumentItem;
  isDimmed?: boolean;
  matchCount?: number;
  children?: ExplorerTreeNode[];
};

const FOLDER_PREFIX = "folder:";
const CARD_PREFIX = "card:";
const DOCUMENT_PREFIX = "document:";

export const toTreeFolderId = (folderId: string): string =>
  `${FOLDER_PREFIX}${folderId}`;

export const toExpandedTreeIds = (expandedFolderIds: Set<string>): string[] =>
  Array.from(expandedFolderIds, (id) => toTreeFolderId(id));

export const buildExplorerTreeData = ({
  rootFolders,
  rootItems,
  getChildFolders,
  getFolderItems,
  isFiltering,
  matchCountMap,
  getFolderId,
}: {
  rootFolders: FolderTreeNode[];
  rootItems: ExplorerItem[];
  getChildFolders: (folderId: string) => FolderTreeNode[];
  getFolderItems: (folderId: string | null) => ExplorerItem[];
  isFiltering: boolean;
  matchCountMap: Map<string, number>;
  getFolderId: (folder: FolderTreeNode) => string;
}): ExplorerTreeNode[] => {
  const buildItemNode = (item: ExplorerItem): ExplorerTreeNode => {
    if (item.type === "card") {
      const cardTitle =
        item.data.title ||
        (
          (item.data as unknown).questionText ||
          (item.data as unknown).question_text ||
          ""
        )
          .replace(/<[^>]*>/g, "")
          .trim()
          .slice(0, 50) ||
        "無題のカード";

      return {
        id: `${CARD_PREFIX}${item.data.id}`,
        rawId: item.data.id,
        name: cardTitle,
        kind: "card",
        card: item.data,
      };
    }

    return {
      id: `${DOCUMENT_PREFIX}${item.data.id}`,
      rawId: item.data.id,
      name: item.data.title || "無題のドキュメント",
      kind: "document",
      document: item.data,
    };
  };

  const buildFolderNode = (folder: FolderTreeNode): ExplorerTreeNode | null => {
    const folderId = getFolderId(folder);
    const matchCount = isFiltering ? (matchCountMap.get(folderId) ?? 0) : -1;

    // フィルタ時は一致のないフォルダをツリーから除外し、結果表示との視覚的整合を保つ
    if (isFiltering && matchCount === 0) return null;

    const childFolderNodes = getChildFolders(folderId)
      .map(buildFolderNode)
      .filter((node): node is ExplorerTreeNode => node !== null);
    const itemNodes = getFolderItems(folderId).map(buildItemNode);

    return {
      id: toTreeFolderId(folderId),
      rawId: folderId,
      name: folder.folderName || folder.folder_name || "無題のフォルダ",
      kind: "folder",
      folder,
      isDimmed: false,
      matchCount,
      children: [...childFolderNodes, ...itemNodes],
    };
  };

  return [
    ...rootFolders
      .map(buildFolderNode)
      .filter((node): node is ExplorerTreeNode => node !== null),
    ...rootItems.map(buildItemNode),
  ];
};

export const toSelectedTreeId = (
  selectedFolderId: string | null,
  selectedItem: SelectedExplorerItem,
): string | null => {
  if (selectedItem?.type === "card") return `${CARD_PREFIX}${selectedItem.id}`;
  if (selectedItem?.type === "document")
    return `${DOCUMENT_PREFIX}${selectedItem.id}`;
  if (selectedFolderId) return toTreeFolderId(selectedFolderId);
  return null;
};

export const parseSelectedTreeId = (
  treeId: string,
): { type: "folder" | "card" | "document"; id: string } | null => {
  if (treeId.startsWith(FOLDER_PREFIX))
    return { type: "folder", id: treeId.slice(FOLDER_PREFIX.length) };
  if (treeId.startsWith(CARD_PREFIX))
    return { type: "card", id: treeId.slice(CARD_PREFIX.length) };
  if (treeId.startsWith(DOCUMENT_PREFIX))
    return { type: "document", id: treeId.slice(DOCUMENT_PREFIX.length) };
  return null;
};




