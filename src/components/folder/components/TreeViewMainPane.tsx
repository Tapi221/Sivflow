import { RightPane } from "@/components/folder/panes/RightPane";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";

interface TreeViewMainPaneProps {
  showMobileDetail: boolean;
  hideOnSectionList?: boolean;
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocument: DocumentItem | null;
  selectedFolderId: string | null;
  selectedFolderName: string;
  folders: Folder[];
  cards: Card[];
  documents: DocumentItem[];
  folderCards: Card[];
  folderStats: {
    dueCount: number;
    unlearnedCount: number;
    lastReviewedAt: Date | null;
  };
  onItemSelect: (item: SelectedExplorerItem) => void;
  onFolderSelect: (folderId: string | null) => void;
  onCardUpdated: () => void;
  onDocumentUpdated: (
    documentId: string,
    updates: Partial<DocumentItem>,
  ) => Promise<void> | void;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
  folderSelectionNonce: number;
}

export const TreeViewMainPane = ({
  showMobileDetail,
  hideOnSectionList = false,
  selectedItem,
  selectedCardId,
  selectedDocument,
  selectedFolderId,
  selectedFolderName,
  folders,
  cards,
  documents,
  folderCards,
  folderStats,
  onCardUpdated,
  onDocumentUpdated,
  onRenameFolder,
  handlers,
  folderSelectionNonce,
}: TreeViewMainPaneProps) => {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-white",
        hideOnSectionList && "hidden",
        showMobileDetail ? "flex" : "hidden md:flex",
      )}
    >
      <RightPane
        selectedItem={selectedItem}
        selectedCardId={selectedCardId}
        selectedDocument={selectedDocument}
        selectedFolderId={selectedFolderId}
        selectedFolderName={selectedFolderName}
        folders={folders}
        cards={cards}
        documents={documents}
        folderCards={folderCards}
        folderStats={folderStats}
        onCardUpdated={onCardUpdated}
        onDocumentUpdated={onDocumentUpdated}
        onRenameFolder={
          selectedFolderId
            ? async (newName: string) => {
                await onRenameFolder(selectedFolderId, newName);
              }
            : undefined
        }
        handlers={handlers}
        folderSelectionNonce={folderSelectionNonce}
      />
    </div>
  );
};