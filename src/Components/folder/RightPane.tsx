import React from 'react';
import type { Card, DocumentItem } from '@/types';
import { CardPane } from './CardPane';
import { FolderDashboard } from './FolderDashboard';
import { PdfPane } from '@/Components/pdf/PdfPane';
import { PowerPointPane } from '@/Components/pptx/PowerPointPane';

interface RightPaneProps {
  selectedCardId: string | null;
  selectedDocument: DocumentItem | null;
  selectedFolderId: string | null;
  selectedFolderName: string;
  folderCards: Card[];
  folderStats: {
    dueCount: number;
    unlearnedCount: number;
    lastReviewedAt: Date | null;
  };
  onCardUpdated: () => void;
  onDocumentUpdated?: (documentId: string, updates: Partial<DocumentItem>) => Promise<void>;
  handlers: {
    onStartStudy: () => void;
    onCreateCard: () => void;
    onBulkCreate: () => void;
  };
}

export function RightPane({
  selectedCardId,
  selectedDocument,
  selectedFolderId,
  selectedFolderName,
  folderCards,
  folderStats,
  onCardUpdated,
  onDocumentUpdated,
  handlers,
}: RightPaneProps) {
  if (selectedDocument) {
    if (selectedDocument.kind === 'pptx') {
      return <PowerPointPane doc={selectedDocument} />;
    }
    return (
      <PdfPane
        doc={selectedDocument}
        onDocumentUpdate={
          onDocumentUpdated
            ? (updates) => onDocumentUpdated(selectedDocument.id, updates)
            : undefined
        }
      />
    );
  }

  if (selectedCardId) {
    return <CardPane selectedCardId={selectedCardId} onCardUpdated={onCardUpdated} />;
  }

  if (selectedFolderId) {
    return (
      <FolderDashboard
        folderId={selectedFolderId}
        folderName={selectedFolderName}
        cards={folderCards}
        stats={folderStats}
        handlers={handlers}
      />
    );
  }

  return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
}
