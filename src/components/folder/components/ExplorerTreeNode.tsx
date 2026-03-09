import {
    extractPdfFiles,
    extractPptxFiles,
    isFileDragEvent,
} from "@/components/folder/explorer/model/utils";
import { FolderRow } from "@/components/folder/explorer/rows/FolderRow";
import { EXPLORER_ROW_BASE_CLASS_NAME } from "@/components/folder/explorer/rows/shared";
import type { ExplorerTreeNode as TreeNode } from "@/components/folder/explorer/tree/arboristAdapter";
import { cn } from "@/lib/utils";
import { FileText, Layers, ChevronRight, ChevronDown } from "@/ui/icons";
import React from "react";

interface ExplorerTreeNodeProps {
  node: { data: TreeNode; level: number };
  style: React.CSSProperties;
  isOpen: boolean;
  isSelected: boolean;
  toggle: () => void;
  // editing
  editingId: string | null;
  editingName: string;
  editingNameRef: React.MutableRefObject<string>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  editInputRef: React.RefObject<HTMLInputElement>;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  // drag/drop
  fileDragFolderId: string | null;
  setFileDragFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  handlePdfDropped: (folderId: string, files: File[]) => Promise<void>;
  handlePptxDropped: (folderId: string, files: File[]) => Promise<void>;
  // row menu
  openRowMenuId: string | null;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  // actions
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: { type: "card" | "cardSet" | "document"; id: string }) => void;
  handleCreateFolderAction: (parentId: string | null) => void;
  handleCreateCardSetAction: (folderId: string | null) => void;
  handleDelete: (id: string, type: "folder" | "card") => void;
  handleRenameConfirm: () => Promise<void>;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  // pin
  pinnedItems?: Array<{ type: "folder" | "card" | "document"; id: string }>;
  onPinItem?: (item: { type: "folder" | "card" | "document"; id: string }) => void;
  onUnpinItem?: (item: { type: "folder" | "card" | "document"; id: string }) => void;
  // filter
  isFiltering: boolean;
  // delete/update capability
  hasUpdateOrDelete: boolean;
  // bulk tag
  setBulkTagFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  cardSetNameSelection?: { id: string; start: number; end: number } | null;
  clearCardSetNameSelection?: () => void;
}

export const ExplorerTreeNodeRenderer = React.memo(
  function ExplorerTreeNodeRenderer({
    node,
    style,
    isOpen,
    isSelected,
    toggle,
    editingId,
    editingName,
    editingNameRef,
    renameCancelledRef,
    editInputRef,
    setEditingId,
    setEditingName,
    fileDragFolderId,
    setFileDragFolderId,
    handlePdfDropped,
    handlePptxDropped,
    openRowMenuId,
    setOpenRowMenuId,
    onFolderSelect,
    onItemSelect,
    handleCreateFolderAction,
    handleCreateCardSetAction,
    handleDelete,
    handleRenameConfirm,
    setRowRef,
    pinnedItems,
    onPinItem,
    onUnpinItem,
    isFiltering,
    hasUpdateOrDelete,
    setBulkTagFolderId,
    cardSetNameSelection,
    clearCardSetNameSelection,
  }: ExplorerTreeNodeProps) {
    const ROW_BASE = EXPLORER_ROW_BASE_CLASS_NAME;
    const treeNode = node.data;

    if (treeNode.kind === "folder" && treeNode.folder) {
      const folderId = treeNode.rawId;
const isPinned =
        pinnedItems?.some((item) => item.type === "folder" && item.id === folderId) ??
        false;

      return (
        <div style={style}>
          <FolderRow
            folder={treeNode.folder}
            depth={0}
            isExpanded={isOpen}
            isSelected={isSelected}
            isEditing={editingId === folderId}
            editingId={editingId}
            setEditingId={setEditingId}
            editingName={editingName}
            setEditingName={setEditingName}
            editingNameRef={editingNameRef}
            editInputRef={editInputRef as unknown as React.RefObject<HTMLInputElement>}
            onToggle={toggle}
            onSelect={() => onFolderSelect(folderId)}
            onNavigate={() => onFolderSelect(folderId)}
            handleCreateFolderAction={handleCreateFolderAction}
            handleCreateCardSetAction={handleCreateCardSetAction}
            handleDelete={handleDelete}
            handleRenameConfirm={handleRenameConfirm}
            renameCancelledRef={renameCancelledRef}
            isPinned={isPinned}
            handleTogglePin={() => {
              if (isPinned) onUnpinItem?.({ type: "folder", id: folderId });
              else onPinItem?.({ type: "folder", id: folderId });
            }}
            isFiltering={isFiltering}
            matchCount={treeNode.matchCount ?? -1}
            rowBaseClassName={ROW_BASE}
            hasUpdateOrDelete={hasUpdateOrDelete}
            menuOpen={openRowMenuId === `folder:${folderId}`}
            onMenuOpenChange={(open) =>
              setOpenRowMenuId(
                open
                  ? `folder:${folderId}`
                  : (prev) => (prev === `folder:${folderId}` ? null : prev),
              )
            }
            onBulkTag={() => setBulkTagFolderId(folderId)}
            setRowRef={setRowRef as (id: string, node: HTMLElement | null) => void}
            isDimmed={Boolean(treeNode.isDimmed)}
            isFileDraggingOver={fileDragFolderId === folderId}
            onDragEnterCapture={(e) => {
              if (!isFileDragEvent(e)) return;
              e.preventDefault();
              e.stopPropagation();
              setFileDragFolderId(folderId);
            }}
            onDragOverCapture={(e) => {
              if (!isFileDragEvent(e)) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "copy";
              setFileDragFolderId(folderId);
            }}
            onDragLeaveCapture={(e) => {
              if (!isFileDragEvent(e)) return;
              const nextTarget = e.relatedTarget as Node | null;
              if (nextTarget && e.currentTarget.contains(nextTarget)) return;
              setFileDragFolderId((prev) => (prev === folderId ? null : prev));
            }}
            onDropCapture={(e) => {
              if (!isFileDragEvent(e)) return;
              e.preventDefault();
              e.stopPropagation();
              setFileDragFolderId(null);
              const files = e.dataTransfer?.files ?? null;
              const pdfFiles = extractPdfFiles(files);
              const pptxFiles = extractPptxFiles(files);
              if (pdfFiles.length > 0) void handlePdfDropped(folderId, pdfFiles);
              if (pptxFiles.length > 0) void handlePptxDropped(folderId, pptxFiles);
            }}
            hasExpandableContent={Boolean(treeNode.children?.length)}
          />
        </div>
      );
    }

    // CardSet ノード
    if (treeNode.kind === "cardSet") {
      const Chevron = isOpen ? ChevronDown : ChevronRight;
      const hasChildren = (treeNode.children?.length ?? 0) > 0;
      const isEditing = editingId === treeNode.rawId;
      const shouldPartialSelect =
        Boolean(cardSetNameSelection) && cardSetNameSelection?.id === treeNode.rawId;
      return (
        <div style={style}>
          <div
            ref={(el) => setRowRef(treeNode.rawId, el)}
            className={cn(
              ROW_BASE,
              "flex h-7 min-h-7 items-center pr-2 leading-7 select-none cursor-pointer",
              isSelected
                ? "bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text,#202123)]"
                : "hover:bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text,#202123)]",
            )}
            data-selected={isSelected || undefined}
            style={{ paddingLeft: `${node.level * 12 + 4}px` }}
            onClick={() => {
              onItemSelect({ type: "cardSet", id: treeNode.rawId });
            }}
          >
            <button
              type="button"
              className="mr-1 grid h-4 w-4 shrink-0 place-items-center"
              onClick={(event) => {
                event.stopPropagation();
                if (hasChildren) toggle();
              }}
              aria-label={isOpen ? "カードセットを折りたたむ" : "カードセットを展開する"}
            >
              {hasChildren ? (
                <Chevron className="h-3 w-3 text-[var(--sidebar-text-muted,#6e6e80)]" />
              ) : null}
            </button>
            <Layers
              className={cn(
                "mr-2 h-4 w-4 shrink-0",
                isSelected
                  ? "text-[var(--sidebar-text,#202123)]"
                  : "text-[var(--sidebar-text-muted,#6e6e80)]",
              )}
            />
            {isEditing ? (
              <input
                ref={editInputRef}
                aria-label="カードセット名の編集"
                className="h-6 w-full rounded border border-slate-300 bg-white px-1 text-sm text-[#1f2328] outline-none select-text"
                value={editingName}
                onFocus={(e) => {
                  if (shouldPartialSelect && cardSetNameSelection) {
                    e.currentTarget.setSelectionRange(
                      cardSetNameSelection.start,
                      cardSetNameSelection.end,
                    );
                    clearCardSetNameSelection?.();
                    return;
                  }
                  e.currentTarget.select();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                }}
                onChange={(e) => {
                  setEditingName(e.target.value);
                  editingNameRef.current = e.target.value;
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    renameCancelledRef.current = true;
                    e.currentTarget.blur();
                  }
                }}
                onBlur={() => {
                  void handleRenameConfirm();
                }}
              />
            ) : (
              <span className="truncate text-sm font-medium">
                {treeNode.name}
              </span>
            )}
            {hasChildren && (
              <span className="ml-auto text-[10px] text-[var(--sidebar-text-muted,#6e6e80)] tabular-nums">
                {treeNode.children!.length}
              </span>
            )}
          </div>
        </div>
      );
    }

    const iconClassName =
      treeNode.kind === "document"
        ? "text-[var(--sidebar-text-muted,#6e6e80)]"
        : "text-[var(--sidebar-text-muted,#6e6e80)]";

    return (
      <div style={style}>
        <div
          ref={(el) => setRowRef(treeNode.rawId, el)}
          className={cn(
            ROW_BASE,
            "flex h-6 min-h-6 items-center pr-2 pl-0 leading-6 select-none",
            (treeNode.kind === "card" || treeNode.kind === "document") &&
              "sidebar-row--document",
          )}
          data-selected={isSelected || undefined}
          style={{ paddingLeft: "4px" }}
          onClick={() => {
            if (treeNode.kind === "card")
              onItemSelect({ type: "card", id: treeNode.rawId });
            if (treeNode.kind === "document")
              onItemSelect({ type: "document", id: treeNode.rawId });
          }}
        >
          <span className="mr-1 size-4 shrink-0" />
          <FileText
            className={cn("mr-2 h-4 w-4 shrink-0", iconClassName)}
            style={{ transform: "translateY(-1px)" }}
          />
          <span
            className={cn(
              "truncate text-sm",
              isSelected
                ? "font-medium text-[var(--sidebar-text,#202123)]"
                : "text-[var(--sidebar-text,#202123)]",
            )}
          >
            {treeNode.name}
          </span>
        </div>
      </div>
    );
  },
);





