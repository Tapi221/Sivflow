import React from "react";
import { FileText, MoreVertical } from "@/ui/icons";
import { cn } from "@/lib/utils";
import { DocumentRowMenu } from "../../DocumentRowMenu";
import type { DocumentItem } from "../model/utils";
import { getExplorerRowStyle } from "./shared";

interface DocumentRowProps {
  doc: DocumentItem;
  depth: number;
  isSelected: boolean;
  onSelect: (item: { type: "document"; id: string }) => void;
  // 以下、ContextMenu 用のプロップス
  treeFolders: unknown[];
  treeCards: unknown[];
  documents: unknown[];
  onUpdateFolder?: (folderId: string, data: unknown) => Promise<void>;
  isPinned: boolean;
  handleTogglePin: () => void;
  rowBaseClassName: string;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
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
  menuOpen,
  onMenuOpenChange,
}) => {
  const docId = doc.id;
  const title = doc.title || "無題のドキュメント";

  return (
    <div
      ref={(node) => setRowRef(docId, node)}
      className={cn(rowBaseClassName, "sidebar-row--document pr-9 cursor-pointer")}
      data-selected={isSelected ? "true" : undefined}
      style={getExplorerRowStyle(depth)}
      onClick={() => onSelect({ type: "document", id: docId })}
    >
      <div className="flex-1 flex items-center min-w-0 h-full pr-1">
        <FileText
          className={cn(
            "sidebar-icon w-4 h-4 mr-2 shrink-0 text-[#6E6E80] group-hover:text-[#202123]",
            isSelected && "text-primary-700",
          )}
        />
        <span
          className={cn(
            "sidebar-title text-sm truncate lining-nums tabular-nums",
            isSelected ? "text-primary-700 font-medium" : "text-[#202123]",
          )}
        >
          {title}
        </span>
        {doc.sizeBytes && (
          <span className="ml-2 text-[10px] text-[#6E6E80] shrink-0 lining-nums tabular-nums">
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
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          onUpdateFolder={onUpdateFolder}
          isPinned={isPinned}
          onTogglePin={handleTogglePin}
        >
          <button
            type="button"
            aria-label="ドキュメントメニューを開く"
            className={cn(
              "sidebar-action h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-[#6E6E80] hover:text-[#202123] outline-none pointer-events-auto transition-all shrink-0",
              "opacity-0 group-hover:opacity-100",
              (isSelected || menuOpen) && "opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="sidebar-icon h-4 w-4" />
          </button>
        </DocumentRowMenu>
      </div>
    </div>
  );
};
