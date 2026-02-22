import React from 'react';
import { FileText, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentRowMenu } from '../../DocumentRowMenu';
import type { Card, DocumentItem, FolderTreeNode } from '../model/utils';

interface DocumentRowProps {
  doc: DocumentItem;
  depth: number;
  isSelected: boolean;
  onSelect: (item: { type: 'document'; id: string }) => void;
  // 以下、ContextMenu 用のプロップス
  treeFolders: any[];
  treeCards: any[];
  documents: any[];
  onUpdateFolder?: (folderId: string, data: any) => Promise<void>;
  isPinned: boolean;
  handleTogglePin: () => void;
  rowBaseClassName: string;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  isDragging: boolean;
}

export const DocumentRow: React.FC<DocumentRowProps> = ({
  doc,
  depth,
  isSelected,
  onSelect,
  treeFolders,
  treeCards,
  documents,
  onUpdateFolder,
  isPinned,
  handleTogglePin,
  rowBaseClassName,
  setRowRef,
  isDragging,
}) => {
  const docId = doc.id;
  const title = doc.title || '無題のドキュメント';

  return (
    <div
      ref={(node) => setRowRef(docId, node)}
      className={cn(
        rowBaseClassName,
        !isDragging && "hover:bg-slate-100",
        isSelected && "bg-primary-100/80",
        "pr-9",
        "cursor-pointer"
      )}
      style={{
        paddingLeft: `${depth * 12 + 4}px`,
        height: 32,
        minHeight: 32,
        boxSizing: 'border-box',
      }}
      onClick={() => onSelect({ type: 'document', id: docId })}
    >
      <div className="flex-1 flex items-center min-w-0 h-full pr-1">
        <FileText className="w-4 h-4 text-rose-500 mr-2 shrink-0" />
        <span className={cn(
          "text-sm truncate leading-5 lining-nums tabular-nums",
          isSelected ? "text-primary-700 font-medium" : "text-slate-700"
        )}>
          {title}
        </span>
        {doc.sizeBytes && (
          <span className="ml-2 text-[10px] text-slate-400 shrink-0 lining-nums tabular-nums">
            {(doc.sizeBytes / 1024).toFixed(1)}KB
          </span>
        )}
      </div>

      <div className="absolute right-1 top-0 h-full flex items-center pointer-events-none">
        <DocumentRowMenu
          doc={doc}
          folders={treeFolders}
          cards={treeCards}
          documents={documents}
          onUpdateFolder={onUpdateFolder}
          isPinned={isPinned}
          onTogglePin={handleTogglePin}
        >
          <button
            type="button"
            aria-label="ドキュメントメニューを開く"
            className="h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 outline-none pointer-events-auto transition-colors shrink-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DocumentRowMenu>
      </div>
    </div>
  );
};
