import type { ComponentProps } from "react";
import { RecentPanel } from "@/components/explorer/RecentPanel";
import type {
  Card,
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";
import { FolderTreeWithCards } from "@/components/folder/components/views/FolderTreeWithCards";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";

type FolderTreeWithCardsProps = ComponentProps<typeof FolderTreeWithCards>;
type RecentPanelProps = ComponentProps<typeof RecentPanel>;

interface TreeViewTabContentProps {
  explorerTab: string;
  sidebarDisplayMode?: "tree" | "navigation";
  recent: RecentPanelProps["recent"];
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  filteredCards: Card[];
  filteredDocuments: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  isFiltering: boolean;
  onRegisterCreateFolderTrigger?: (fn: (() => void) | null) => void;
  onRegisterCreateCardSetTrigger?: (
    fn: ((folderId?: string | null) => void) | null,
  ) => void;
  onRegisterDocumentTrigger?: (fn: () => void) => void;
  navigateToSectionListToken: number;
  folderSelectionNonce: number;
  onSectionListModeChange?: (isSectionListMode: boolean) => void;
  onHeaderFolderIdChange?: (folderId: string | null) => void;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onClearRecent: RecentPanelProps["onClearRecent"];
  onCreateFolder: FolderTreeWithCardsProps["onCreateFolder"];
  onUpdateFolder: FolderTreeWithCardsProps["onUpdateFolder"];
  onDeleteFolder: FolderTreeWithCardsProps["onDeleteFolder"];
  onCreateCardSet: FolderTreeWithCardsProps["onCreateCardSet"];
  onUpdateCardSet: FolderTreeWithCardsProps["onUpdateCardSet"];
  onDeleteCardSet: FolderTreeWithCardsProps["onDeleteCardSet"];
  onCreateCard: FolderTreeWithCardsProps["onCreateCard"];
  onUpdateCard: FolderTreeWithCardsProps["onUpdateCard"];
  onDeleteCard: FolderTreeWithCardsProps["onDeleteCard"];
  onUpdateDocument: FolderTreeWithCardsProps["onUpdateDocument"];
  onDeleteDocument: FolderTreeWithCardsProps["onDeleteDocument"];
  moveCardToSet: FolderTreeWithCardsProps["moveCardToSet"];
  moveCardSetToFolder: FolderTreeWithCardsProps["moveCardSetToFolder"];
  moveDocumentToFolder: FolderTreeWithCardsProps["moveDocumentToFolder"];
  reorderCardsInCardSet: FolderTreeWithCardsProps["reorderCardsInCardSet"];
  selectedCardSetId?: string | null;
  onSelectCardSet?: FolderTreeWithCardsProps["onSelectCardSet"];
}

export const TreeViewTabContent = ({
  explorerTab,
  sidebarDisplayMode = "tree",
  recent,
  folders,
  cards,
  cardSets,
  documents,
  filteredCards,
  filteredDocuments,
  selectedFolderId,
  selectedItem,
  isFiltering,
  onRegisterCreateFolderTrigger,
  onRegisterCreateCardSetTrigger,
  onRegisterDocumentTrigger,
  navigateToSectionListToken,
  folderSelectionNonce,
  onSectionListModeChange,
  onHeaderFolderIdChange,
  onFolderSelect,
  onItemSelect,
  onClearRecent,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateCardSet,
  onUpdateCardSet,
  onDeleteCardSet,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onUpdateDocument,
  onDeleteDocument,
  moveCardToSet,
  moveCardSetToFolder,
  moveDocumentToFolder,
  reorderCardsInCardSet,
  selectedCardSetId,
  onSelectCardSet,
}: TreeViewTabContentProps) => {
  switch (explorerTab) {
    case "recent":
      return (
        <div className="h-full w-full min-w-0">
          <RecentPanel
            recent={recent}
            folders={folders}
            cards={cards}
            documents={documents}
            onFolderSelect={onFolderSelect}
            onItemSelect={onItemSelect}
            onClearRecent={onClearRecent}
          />
        </div>
      );

    case "explorer":
    default:
      return (
        <div className="h-full w-full min-w-0">
          <FolderTreeWithCards
            className="h-full w-full min-w-0"
            sidebarDisplayMode={sidebarDisplayMode}
            folders={folders as unknown as FolderTreeNode[]}
            cards={filteredCards}
            cardSets={cardSets}
            documents={filteredDocuments}
            selectedFolderId={selectedFolderId}
            selectedItem={selectedItem}
            onFolderSelect={onFolderSelect}
            onItemSelect={onItemSelect}
            onCreateFolder={onCreateFolder}
            onUpdateFolder={onUpdateFolder}
            onDeleteFolder={onDeleteFolder}
            onCreateCardSet={onCreateCardSet}
            onUpdateCardSet={onUpdateCardSet}
            onDeleteCardSet={onDeleteCardSet}
            onCreateCard={onCreateCard}
            onUpdateCard={onUpdateCard}
            onDeleteCard={onDeleteCard}
            onUpdateDocument={onUpdateDocument}
            onDeleteDocument={onDeleteDocument}
            moveCardToSet={moveCardToSet}
            moveCardSetToFolder={moveCardSetToFolder}
            moveDocumentToFolder={moveDocumentToFolder}
            reorderCardsInCardSet={reorderCardsInCardSet}
            selectedCardSetId={selectedCardSetId}
            onSelectCardSet={onSelectCardSet}
            isFiltering={isFiltering}
            onRegisterCreateFolderTrigger={onRegisterCreateFolderTrigger}
            onRegisterCreateCardSetTrigger={onRegisterCreateCardSetTrigger}
            onRegisterDocumentTrigger={onRegisterDocumentTrigger}
            navigateToSectionListToken={navigateToSectionListToken}
            folderSelectionNonce={folderSelectionNonce}
            onSectionListModeChange={onSectionListModeChange}
            onHeaderFolderIdChange={onHeaderFolderIdChange}
          />
        </div>
      );
  }
};
