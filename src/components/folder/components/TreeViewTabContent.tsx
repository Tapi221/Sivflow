import type { ComponentProps } from "react";
import { PinnedPanel } from "@/components/explorer/PinnedPanel";
import { RecentPanel } from "@/components/explorer/RecentPanel";
import type { Card, CardSet, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { FolderTreeWithCards } from "@/components/folder/components/views/FolderTreeWithCards";
import { ViewsPanel } from "@/components/folder/components/views/ViewsPanel";
import type { ViewDef } from "@/components/folder/viewTypes";

type FolderTreeWithCardsProps = ComponentProps<typeof FolderTreeWithCards>;
type PinnedPanelProps = ComponentProps<typeof PinnedPanel>;
type RecentPanelProps = ComponentProps<typeof RecentPanel>;
type ViewsPanelProps = ComponentProps<typeof ViewsPanel>;

interface TreeViewTabContentProps {
  explorerTab: string;
  pinnedItems: PinnedPanelProps["pinnedItems"];
  recent: RecentPanelProps["recent"];
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  filteredCards: Card[];
  filteredDocuments: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  activeCustomView: ViewDef | null;
  customViews: ViewDef[];
  virtualTreeNodes: ViewsPanelProps["nodes"];
  isFiltering: boolean;
  createFolderRequestToken: number;
  createCardSetRequestToken: number;
  onRegisterPdfTrigger: (fn: () => void) => void;
  onRegisterPptxTrigger: (fn: () => void) => void;
  navigateToSectionListToken: number;
  folderSelectionNonce: number;
  onHeaderFolderIdChange?: (folderId: string | null) => void;
  getFolderPath: PinnedPanelProps["getFolderPath"];
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onClearRecent: RecentPanelProps["onClearRecent"];
  onSelectView: ViewsPanelProps["onSelectView"];
  onOpenManager: ViewsPanelProps["onOpenManager"];
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
  onPinItem: FolderTreeWithCardsProps["onPinItem"];
  onUnpinItem: FolderTreeWithCardsProps["onUnpinItem"];
  selectedCardSetId?: string | null;
  onSelectCardSet?: FolderTreeWithCardsProps["onSelectCardSet"];
}

export function TreeViewTabContent({
  explorerTab,
  pinnedItems,
  recent,
  folders,
  cards,
  cardSets,
  documents,
  filteredCards,
  filteredDocuments,
  selectedFolderId,
  selectedItem,
  activeCustomView,
  customViews,
  virtualTreeNodes,
  isFiltering,
  createFolderRequestToken,
  createCardSetRequestToken,
  onRegisterPdfTrigger,
  onRegisterPptxTrigger,
  navigateToSectionListToken,
  folderSelectionNonce,
  onHeaderFolderIdChange,
  getFolderPath,
  onFolderSelect,
  onItemSelect,
  onClearRecent,
  onSelectView,
  onOpenManager,
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
  onPinItem,
  onUnpinItem,
  selectedCardSetId,
  onSelectCardSet,
}: TreeViewTabContentProps) {
  switch (explorerTab) {
    case "pinned":
      return (
        <PinnedPanel
          pinnedItems={pinnedItems}
          folders={folders}
          cards={cards}
          documents={documents}
          onFolderSelect={onFolderSelect}
          onItemSelect={onItemSelect}
          onUnpinItem={onUnpinItem}
          getFolderPath={getFolderPath}
        />
      );

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

    case "views":
      return (
        <ViewsPanel
          views={customViews}
          selectedViewId={activeCustomView?.id ?? null}
          nodes={virtualTreeNodes}
          cards={filteredCards}
          selectedItem={selectedItem}
          onSelectView={onSelectView}
          onItemSelect={onItemSelect}
          onOpenManager={onOpenManager}
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
          pinnedItems={pinnedItems}
          onPinItem={onPinItem}
          onUnpinItem={onUnpinItem}
          selectedCardSetId={selectedCardSetId}
          onSelectCardSet={onSelectCardSet}
          isFiltering={isFiltering}
          createFolderRequestToken={createFolderRequestToken}
          createCardSetRequestToken={createCardSetRequestToken}
          onRegisterPdfTrigger={onRegisterPdfTrigger}
          onRegisterPptxTrigger={onRegisterPptxTrigger}
          navigateToSectionListToken={navigateToSectionListToken}
          folderSelectionNonce={folderSelectionNonce}
          onHeaderFolderIdChange={onHeaderFolderIdChange}
        />
      );
  }
}
