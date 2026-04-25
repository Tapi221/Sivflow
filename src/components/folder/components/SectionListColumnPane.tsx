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
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
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
  onFolderSelect,
  onItemSelect,
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
        onFolderSelect={onFolderSelect}
        onItemSelect={onItemSelect}
      />
    </SectionListBlankPane>
  );
};
