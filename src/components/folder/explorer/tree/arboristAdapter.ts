import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import type { FolderTreeArboristNode } from "@/components/sidebar/FolderTreeArborist";
import { getCardText } from "@/domain/card/content";
import type {
    Card,
    CardSet,
    DocumentItem,
    ExplorerItem,
    SelectedExplorerItem,
} from "@/types";

export type ExplorerTreeNode = FolderTreeArboristNode & {
  kind: "folder" | "cardSet" | "card" | "document";
  rawId: string;
  folder?: FolderTreeNode;
  cardSet?: CardSet;
  card?: Card;
  document?: DocumentItem;
  isDimmed?: boolean;
  matchCount?: number;
  children?: ExplorerTreeNode[];
};

const FOLDER_PREFIX = "folder:";
const CARD_SET_PREFIX = "cardSet:";
const CARD_PREFIX = "card:";
const DOCUMENT_PREFIX = "document:";

const toTreeFolderId = (folderId: string): string =>
  `${FOLDER_PREFIX}${folderId}`;

export const toExpandedTreeIds = (
  expandedFolderIds: Set<string>,
  expandedCardSetIds: Set<string> = new Set<string>(),
): string[] => [
  ...Array.from(expandedFolderIds, (id) => toTreeFolderId(id)),
  ...Array.from(expandedCardSetIds, (id) => `${CARD_SET_PREFIX}${id}`),
];

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
}: {
  rootFolders: FolderTreeNode[];
  rootItems: ExplorerItem[];
  getChildFolders: (folderId: string) => FolderTreeNode[];
  getFolderItems: (folderId: string | null) => ExplorerItem[];
  /** フォルダIDに属するCardSetの一覧を返す */
  getCardSets?: (folderId: string | null) => CardSet[];
  /** CardSetIDに属するカード一覧を返す（ExplorerItem形式） */
  getCardSetItems?: (cardSetId: string) => ExplorerItem[];
  isFiltering: boolean;
  matchCountMap: Map<string, number>;
  getFolderId: (folder: FolderTreeNode) => string;
}): ExplorerTreeNode[] => {
  const buildItemNode = (item: ExplorerItem): ExplorerTreeNode => {
    if (item.type === "card") {
      const cardTitle =
        item.data.title ||
        getCardText(item.data, "question")
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

  const buildCardSetNode = (cs: CardSet): ExplorerTreeNode => {
    const cardItems = getCardSetItems ? getCardSetItems(cs.id) : [];
    return {
      id: `${CARD_SET_PREFIX}${cs.id}`,
      rawId: cs.id,
      name: cs.name || "無題のセット",
      kind: "cardSet",
      cardSet: cs,
      children: cardItems.map(buildItemNode),
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

    // Card は必ず CardSet 配下に表示する（フォルダ直下には表示しない）
    const cardSets = getCardSets ? getCardSets(folderId) : [];
    const cardSetNodes: ExplorerTreeNode[] = cardSets.map(buildCardSetNode);

    // ドキュメントは常にフォルダ直下に表示（CardSetと無関係）
    const docItems = getFolderItems(folderId)
      .filter((i) => i.type === "document")
      .map(buildItemNode);

    return {
      id: toTreeFolderId(folderId),
      rawId: folderId,
      name: folder.folderName || folder.folder_name || "無題のフォルダ",
      kind: "folder",
      folder,
      isDimmed: false,
      matchCount,
      children: [...childFolderNodes, ...cardSetNodes, ...docItems],
    };
  };

  const rootDocumentNodes = rootItems
    .filter((item) => item.type === "document")
    .map(buildItemNode);

  return [
    ...rootFolders
      .map(buildFolderNode)
      .filter((node): node is ExplorerTreeNode => node !== null),
    ...rootDocumentNodes,
  ];
};

export const toSelectedTreeId = (
  selectedFolderId: string | null,
  selectedItem: SelectedExplorerItem,
  selectedCardSetId?: string | null,
): string | null => {
  if (selectedItem?.type === "card") return `${CARD_PREFIX}${selectedItem.id}`;
  if (selectedItem?.type === "cardSet") return `${CARD_SET_PREFIX}${selectedItem.id}`;
  if (selectedItem?.type === "document")
    return `${DOCUMENT_PREFIX}${selectedItem.id}`;
  if (selectedCardSetId) return `${CARD_SET_PREFIX}${selectedCardSetId}`;
  if (selectedFolderId) return toTreeFolderId(selectedFolderId);
  return null;
};

export const parseSelectedTreeId = (
  treeId: string,
): { type: "folder" | "cardSet" | "card" | "document"; id: string } | null => {
  if (treeId.startsWith(FOLDER_PREFIX))
    return { type: "folder", id: treeId.slice(FOLDER_PREFIX.length) };
  if (treeId.startsWith(CARD_SET_PREFIX))
    return { type: "cardSet", id: treeId.slice(CARD_SET_PREFIX.length) };
  if (treeId.startsWith(CARD_PREFIX))
    return { type: "card", id: treeId.slice(CARD_PREFIX.length) };
  if (treeId.startsWith(DOCUMENT_PREFIX))
    return { type: "document", id: treeId.slice(DOCUMENT_PREFIX.length) };
  return null;
};




