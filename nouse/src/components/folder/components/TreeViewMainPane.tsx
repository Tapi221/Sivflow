import { cn } from "@web-renderer/lib/utils";
import { RightPane } from "@/components/folder/panes/RightPane";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";



type TreeViewMainPaneProps = {
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
  onCardUpdated: () => void;
  onDocumentUpdated?: (documentId: string, updates: Partial<DocumentItem>) => Promise<void> | void;
  onRenameFolder?: (newName: string) => Promise<void>;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
  folderSelectionNonce: number;
};



const TreeViewMainPane = ({ showMobileDetail, hideOnSectionList = false, selectedItem, selectedCardId, selectedDocument, selectedFolderId, selectedFolderName, folderCards, onCardUpdated, onDocumentUpdated, onRenameFolder, handlers, folderSelectionNonce }: TreeViewMainPaneProps) => {
  const shouldHidePane = hideOnSectionList && !showMobileDetail;

  return (
    <section className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden bg-transparent", showMobileDetail ? "flex" : "hidden md:flex", shouldHidePane && "hidden")} aria-hidden={shouldHidePane}>
      <RightPane selectedItem={selectedItem} selectedCardId={selectedCardId} selectedDocument={selectedDocument} selectedFolderId={selectedFolderId} selectedFolderName={selectedFolderName} folderCards={folderCards} onCardUpdated={onCardUpdated} onDocumentUpdated={onDocumentUpdated} onRenameFolder={onRenameFolder} handlers={handlers} folderSelectionNonce={folderSelectionNonce} />
    </section>
  );
};



export { TreeViewMainPane };
