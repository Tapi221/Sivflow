import { FolderDashboard } from "@/components/folder/components/views/FolderDashboard";
import { CardPane } from "@/components/folder/panes/CardPane";
import { CardSetListPane } from "@/components/folder/panes/CardSetListPane";
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
  selectedCardSetId?: string | null;
  selectedDocument: DocumentItem | null;
  selectedFolderId: string | null;
  selectedFolderName: string;
  onCardSetSelect?: (cardSetId: string) => void;
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
  onRenameFolder?: (folderId: string, newName: string) => Promise<void> | void;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
}

export function RightPane({
  selectedItem,
  selectedCardId,
  selectedCardSetId,
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
  onCardSetSelect,
  handlers,
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
    // CardSet が選択されている場合 → CardSet内のCard一覧表示
    if (selectedCardSetId) {
      return (
        <div className="flex h-full min-h-0">
          {/* 左: CardSet一覧 */}
          <div className="w-64 shrink-0 border-r border-slate-100 overflow-y-auto">
            <CardSetListPane
              folderId={selectedFolderId}
              selectedCardSetId={selectedCardSetId}
              onCardSetSelect={onCardSetSelect ?? (() => {})}
            />
          </div>
          {/* 右: 選択CardSetのカード一覧 (FolderDashboardを流用) */}
          <div className="min-w-0 flex-1">
            <FolderDashboard
              folderId={selectedFolderId}
              folderName={selectedFolderName}
              cards={folderCards.filter((c) => c.cardSetId === selectedCardSetId)}
              handlers={handlers}
              onRenameFolder={undefined}
            />
          </div>
        </div>
      );
    }

    // CardSet 未選択 → CardSet一覧を表示
    return (
      <div className="flex h-full min-h-0">
        <div className="min-w-0 flex-1">
          <CardSetListPane
            folderId={selectedFolderId}
            selectedCardSetId={null}
            onCardSetSelect={onCardSetSelect ?? (() => {})}
          />
        </div>
      </div>
    );
  }

  return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
}


