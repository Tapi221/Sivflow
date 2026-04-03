import type { ComponentProps } from "react";
import { RecentPanel } from "@/components/explorer/RecentPanel";
import type { Card, CardSet, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { FolderTreeWithCards } from "@/components/folder/components/views/FolderTreeWithCards";

type FolderTreeWithCardsProps = ComponentProps<typeof FolderTreeWithCards>;
type RecentPanelProps = ComponentProps<typeof RecentPanel>;

interface TreeViewTabContentProps {
  explorerTab: string;
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
  onRegisterPdfTrigger: (fn: () => void) => void;
  onRegisterPptxTrigger: (fn: () => void) => void;
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
  moveCardToFolder: FolderTreeWithCardsProps["moveCardToFolder"];
  moveCardSetToFolder: FolderTreeWithCardsProps["moveCardSetToFolder"];
  moveDocumentToFolder: FolderTreeWithCardsProps["moveDocumentToFolder"];
  reorderCards: FolderTreeWithCardsProps["reorderCards"];
  selectedCardSetId?: string | null;
  onSelectCardSet?: FolderTreeWithCardsProps["onSelectCardSet"];
}

export function TreeViewTabContent({
  explorerTab,
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
  onRegisterPdfTrigger,
  onRegisterPptxTrigger,
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
  moveCardToFolder,
  moveCardSetToFolder,
  moveDocumentToFolder,
  reorderCards,
  selectedCardSetId,
  onSelectCardSet,
}: TreeViewTabContentProps) {
  switch (explorerTab) {
    case "recent":
      return (
        <RecentPanel
          recent={recent}
          folders={folders}
          cards={cards}
          documents={documents}
          onFolderSelect={onFolderSelect}
          onItemSelect={onItemSelect}
          onClearRecent={onClearRecent}
        />
      );

    case "explorer":
    default:
      return (
        <FolderTreeWithCards
          folders={folders}
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
          moveCardToFolder={moveCardToFolder}
          moveCardSetToFolder={moveCardSetToFolder}
          moveDocumentToFolder={moveDocumentToFolder}
          reorderCards={reorderCards}
          selectedCardSetId={selectedCardSetId}
          onSelectCardSet={onSelectCardSet}
          isFiltering={isFiltering}
          onRegisterCreateFolderTrigger={onRegisterCreateFolderTrigger}
          onRegisterCreateCardSetTrigger={onRegisterCreateCardSetTrigger}
          onRegisterPdfTrigger={onRegisterPdfTrigger}
          onRegisterPptxTrigger={onRegisterPptxTrigger}
          navigateToSectionListToken={navigateToSectionListToken}
          folderSelectionNonce={folderSelectionNonce}
          onSectionListModeChange={onSectionListModeChange}
          onHeaderFolderIdChange={onHeaderFolderIdChange}
        />
      );
  }
}

