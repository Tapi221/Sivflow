import type { ComponentProps } from "react";
import { PinnedPanel } from "@/components/explorer/PinnedPanel";
import { RecentPanel } from "@/components/explorer/RecentPanel";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { FolderTreeWithCards } from "@/components/folder/FolderTreeWithCards";
import { ViewsPanel } from "@/src/components/folder/components/views/ViewsPanel";
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
  navigateToSectionListToken: number;
  getFolderPath: PinnedPanelProps["getFolderPath"];
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onClearRecent: RecentPanelProps["onClearRecent"];
  onSelectView: ViewsPanelProps["onSelectView"];
  onOpenManager: ViewsPanelProps["onOpenManager"];
  onCreateFolder: FolderTreeWithCardsProps["onCreateFolder"];
  onUpdateFolder: FolderTreeWithCardsProps["onUpdateFolder"];
  onDeleteFolder: FolderTreeWithCardsProps["onDeleteFolder"];
  onCreateCard: FolderTreeWithCardsProps["onCreateCard"];
  onUpdateCard: FolderTreeWithCardsProps["onUpdateCard"];
  onDeleteCard: FolderTreeWithCardsProps["onDeleteCard"];
  moveCardToFolder: FolderTreeWithCardsProps["moveCardToFolder"];
  moveDocumentToFolder: FolderTreeWithCardsProps["moveDocumentToFolder"];
  reorderCards: FolderTreeWithCardsProps["reorderCards"];
  onPinItem: FolderTreeWithCardsProps["onPinItem"];
  onUnpinItem: FolderTreeWithCardsProps["onUnpinItem"];
}

export function TreeViewTabContent({
  explorerTab,
  pinnedItems,
  recent,
  folders,
  cards,
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
  navigateToSectionListToken,
  getFolderPath,
  onFolderSelect,
  onItemSelect,
  onClearRecent,
  onSelectView,
  onOpenManager,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  moveCardToFolder,
  moveDocumentToFolder,
  reorderCards,
  onPinItem,
  onUnpinItem,
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
          documents={filteredDocuments}
          selectedFolderId={selectedFolderId}
          selectedItem={selectedItem}
          onFolderSelect={onFolderSelect}
          onItemSelect={onItemSelect}
          onCreateFolder={onCreateFolder}
          onUpdateFolder={onUpdateFolder}
          onDeleteFolder={onDeleteFolder}
          onCreateCard={onCreateCard}
          onUpdateCard={onUpdateCard}
          onDeleteCard={onDeleteCard}
          moveCardToFolder={moveCardToFolder}
          moveDocumentToFolder={moveDocumentToFolder}
          reorderCards={reorderCards}
          pinnedItems={pinnedItems}
          onPinItem={onPinItem}
          onUnpinItem={onUnpinItem}
          isFiltering={isFiltering}
          createFolderRequestToken={createFolderRequestToken}
          navigateToSectionListToken={navigateToSectionListToken}
        />
      );
  }
}


