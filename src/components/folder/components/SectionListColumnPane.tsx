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
  onMoveCardSetToFolder?: (
    cardSetId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onMoveDocumentToFolder?: (
    documentId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onMoveCardToSet?: (
    cardId: string,
    targetCardSetId: string,
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
  onMoveCardSetToFolder,
  onMoveDocumentToFolder,
  onMoveCardToSet,
}: SectionListColumnPaneProps) => {
  return (
    <SectionListBlankPane
      className={className}
      contentClassName="explorer-chrome-font p-0"
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
        onMoveCardSetToFolder={onMoveCardSetToFolder}
        onMoveDocumentToFolder={onMoveDocumentToFolder}
        onMoveCardToSet={onMoveCardToSet}
      />
    </SectionListBlankPane>
  );
};
