import { FolderDashboard } from "@/components/folder/components/views/FolderDashboard";
import { CardPane } from "@/components/folder/panes/CardPane";
import { DirectoryDiagramPane } from "@/components/folder/panes/DirectoryDiagramPane";
import { PdfPane } from "@/components/pdf/PdfPane";
import { PowerPointPane } from "@/components/pptx/PowerPointPane";
import Calendar from "@/pages/Calendar";
import Dashboard from "@/pages/Dashboard";
import Gallery from "@/pages/Gallery";
import Trash from "@/pages/Trash";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";


type PdfPaneUpdateHandler = NonNullable<React.ComponentProps<typeof PdfPane>["onDocumentUpdate"]>;
type PdfPaneUpdates = Parameters<PdfPaneUpdateHandler>[0];
interface RightPaneProps {
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
  onCardUpdated: () => void;
  onDocumentUpdated?: (
    documentId: string,
    updates: Partial<DocumentItem>,
  ) => Promise<void> | void;
  onRenameFolder?: (newName: string) => Promise<void>;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
  folderSelectionNonce: number;
}

export function RightPane({
  selectedItem,
  selectedCardId,
  selectedDocument,
  selectedFolderId,
  selectedFolderName,
  folders,
  cards,
  documents,
  folderCards,
  onCardUpdated,
  onDocumentUpdated,
  onRenameFolder,
  handlers,
  folderSelectionNonce,
}: RightPaneProps) {
  if (selectedItem?.type === "gallery") {
    return <Gallery />;
  }

  if (selectedItem?.type === "directory") {
    return (
      <DirectoryDiagramPane
        folders={folders}
        cards={cards}
        documents={documents}
      />
    );
  }

  if (selectedItem?.type === "calendar") {
    return <Calendar />;
  }

  if (selectedItem?.type === "settings") {
    return <Dashboard />;
  }

  if (selectedItem?.type === "trash") {
    return <Trash />;
  }

  if (selectedDocument) {
    if (selectedDocument.kind === "pptx") {
      return <PowerPointPane doc={selectedDocument} />;
    }

    return (
      <PdfPane
        doc={selectedDocument}
        onDocumentUpdate={
          onDocumentUpdated
            ? async (updates: PdfPaneUpdates) => {
                await onDocumentUpdated(selectedDocument.id, updates as Partial<DocumentItem>);
              }
            : undefined
        }
      />
    );
  }

  if (selectedCardId) {
    return (
      <CardPane
        selectedCardId={selectedCardId}
        onCardUpdated={onCardUpdated}
      />
    );
  }

  if (selectedFolderId) {
    return (
      <FolderDashboard
        folderId={selectedFolderId}
        folderName={selectedFolderName}
        cards={folderCards}
        handlers={handlers}
        onRenameFolder={onRenameFolder}
        folderSelectionNonce={folderSelectionNonce}
      />
    );
  }

  return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
}


