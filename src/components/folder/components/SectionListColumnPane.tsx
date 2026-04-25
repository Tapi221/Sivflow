import { FolderColumnView } from "@/components/folder/components/FolderColumnView";
import { SectionListBlankPane } from "@/components/folder/components/SectionListBlankPane";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import type {
  Card,
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";

interface SectionListColumnPaneProps {
  className?: string;
  sidebarWidth: number;
  topOffsetPx: number;
  leftInsetPx?: number;
  rightInsetPx?: number;
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  isFiltering?: boolean;
  resetToken?: number;
  onFolderSelect?: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onMoveFolder?: (
    folderId: string,
    targetParentFolderId: string | null,
  ) => Promise<void>;
  onReorderFolders?: (
    targetParentFolderId: string | null,
    folderIds: string[],
  ) => Promise<void>;
  onMoveCardSetToFolder?: (
    cardSetId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onReorderCardSets?: (
    targetFolderId: string,
    cardSetIds: string[],
  ) => Promise<void>;
  onMoveDocumentToFolder?: (
    documentId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onReorderDocuments?: (
    targetFolderId: string,
    documentIds: string[],
  ) => Promise<void>;
  onMoveCardToSet?: (
    cardId: string,
    targetCardSetId: string,
  ) => Promise<void>;
  onReorderCardsInCardSet?: (
    cardSetId: string,
    cardIds: string[],
  ) => Promise<void>;
}

/**
 * セクション一覧モードの右側パネルに表示する Finder 風のカラムビュー。
 */
export const SectionListColumnPane = ({
  className,
  sidebarWidth,
  topOffsetPx,
  leftInsetPx = 12,
  rightInsetPx = 12,
  folders,
  cards,
  cardSets = [],
  documents,
  selectedFolderId,
  selectedItem,
  selectedCardSetId = null,
  isFiltering = false,
  resetToken = 0,
  onItemSelect,
  onMoveFolder,
  onReorderFolders,
  onMoveCardSetToFolder,
  onReorderCardSets,
  onMoveDocumentToFolder,
  onReorderDocuments,
  onMoveCardToSet,
  onReorderCardsInCardSet,
}: SectionListColumnPaneProps) => {
  return (
    <SectionListBlankPane
      className={className}
      contentClassName="p-0"
      sidebarWidth={sidebarWidth}
      topOffsetPx={topOffsetPx}
      leftInsetPx={leftInsetPx}
      rightInsetPx={rightInsetPx}
    >
      <FolderColumnView
        folders={folders as unknown as FolderTreeNode[]}
        cards={cards}
        cardSets={cardSets}
        documents={documents}
        selectedFolderId={selectedFolderId}
        selectedItem={selectedItem}
        selectedCardSetId={selectedCardSetId}
        isFiltering={isFiltering}
        resetToken={resetToken}
        onItemSelect={onItemSelect}
        onMoveFolder={onMoveFolder}
        onReorderFolders={onReorderFolders}
        onMoveCardSetToFolder={onMoveCardSetToFolder}
        onReorderCardSets={onReorderCardSets}
        onMoveDocumentToFolder={onMoveDocumentToFolder}
        onReorderDocuments={onReorderDocuments}
        onMoveCardToSet={onMoveCardToSet}
        onReorderCardsInCardSet={onReorderCardsInCardSet}
      />
    </SectionListBlankPane>
  );
};
