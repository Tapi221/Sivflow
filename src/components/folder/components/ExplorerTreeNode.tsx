import {
  extractPdfFiles,
  isFileDragEvent,
} from "@/components/folder/explorer/model/utils";
import { CardSetRow } from "@/components/folder/explorer/rows/CardSetRow";
import { DocumentRow } from "@/components/folder/explorer/rows/DocumentRow";
import { ExplorerRow } from "@/components/folder/explorer/rows/ExplorerRow";
import { ExplorerRowContent } from "@/components/folder/explorer/rows/ExplorerRowContent";
import { FolderRow } from "@/components/folder/explorer/rows/FolderRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import type { ExplorerTreeNode as TreeNode } from "@/components/folder/explorer/tree/arboristAdapter";
import { cn } from "@/lib/utils";
import { FileText } from "@/ui/icons";
import React from "react";

type RenameTarget = {
  id: string;
  type: "folder" | "cardSet" | "card" | "document";
};

interface ExplorerTreeNodeProps {
  node: { data: TreeNode; level: number };
  style: React.CSSProperties;
  isOpen: boolean;
  isSelected: boolean;
  toggle: () => void;
  editingId: string | null;
  editingName: string;
  renameCancelledRef: React.MutableRefObject<boolean>;
  editInputRef: React.MutableRefObject<HTMLInputElement | null>;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  fileDragFolderId: string | null;
  setFileDragFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  handlePdfDropped: (folderId: string, files: File[]) => Promise<void>;
  openRowMenuId: string | null;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: {
    type: "card" | "cardSet" | "document";
    id: string;
  }) => void;
  handleCreateFolderAction: (parentId: string | null) => string;
  handleCreateCardSetAction: (folderId: string | null) => string | null;
  handleDelete: (
    id: string,
    type: "folder" | "cardSet" | "card" | "document",
  ) => void;
  handleRenameConfirm: (target?: RenameTarget) => Promise<void>;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  isFiltering: boolean;
  hasUpdateOrDelete: boolean;
  setBulkTagFolderId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const ExplorerTreeNodeRenderer = React.memo(
  ({
    node,
    style,
    isOpen,
    isSelected,
    toggle,
    editingId,
    editingName,
    renameCancelledRef,
    editInputRef,
    setEditingId,
    setEditingName,
    fileDragFolderId,
    setFileDragFolderId,
    handlePdfDropped,
    openRowMenuId,
    setOpenRowMenuId,
    onFolderSelect,
    onItemSelect,
    handleCreateFolderAction,
    handleCreateCardSetAction,
    handleDelete,
    handleRenameConfirm,
    setRowRef,
    isFiltering,
    hasUpdateOrDelete,
    setBulkTagFolderId,
  }: ExplorerTreeNodeProps) => {
    const treeNode = node.data;
    const depth = node.level;

    if (treeNode.kind === "folder" && treeNode.folder) {
      const folderId = treeNode.rawId;

      return (
        <div style={style}>
          <FolderRow
            folder={treeNode.folder}
            depth={depth}
            isExpanded={isOpen}
            isSelected={isSelected}
            isEditing={editingId === folderId}
            editingId={editingId}
            setEditingId={setEditingId}
            editingName={editingName}
            setEditingName={setEditingName}
            editInputRef={editInputRef}
            onToggle={toggle}
            onSelect={() => onFolderSelect(folderId)}
            onNavigate={() => onFolderSelect(folderId)}
            handleCreateFolderAction={handleCreateFolderAction}
            handleCreateCardSetAction={handleCreateCardSetAction}
            handleDelete={handleDelete}
            handleRenameConfirm={handleRenameConfirm}
            renameCancelledRef={renameCancelledRef}
            isFiltering={isFiltering}
            matchCount={treeNode.matchCount ?? -1}
            rowBaseClassName=""
            hasUpdateOrDelete={hasUpdateOrDelete}
            menuOpen={openRowMenuId === `folder:${folderId}`}
            onMenuOpenChange={(open) =>
              setOpenRowMenuId(open ? `folder:${folderId}` : null)
            }
            onBulkTag={() => setBulkTagFolderId(folderId)}
            setRowRef={setRowRef}
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
              if (pdfFiles.length > 0) {
                void handlePdfDropped(folderId, pdfFiles);
              }
            }}
            hasExpandableContent={Boolean(treeNode.children?.length)}
          />
        </div>
      );
    }

    if (treeNode.kind === "cardSet") {
      const cardSetNode = treeNode as typeof treeNode & { kind: "cardSet" };
      return (
        <CardSetRow
          treeNode={cardSetNode}
          style={style}
          depth={depth}
          isOpen={isOpen}
          isSelected={isSelected}
          toggle={toggle}
          editingId={editingId}
          editingName={editingName}
          renameCancelledRef={renameCancelledRef}
          editInputRef={editInputRef}
          setEditingId={setEditingId}
          setEditingName={setEditingName}
          openRowMenuId={openRowMenuId}
          setOpenRowMenuId={setOpenRowMenuId}
          onItemSelect={onItemSelect}
          handleDelete={handleDelete}
          handleRenameConfirm={handleRenameConfirm}
          setRowRef={setRowRef}
        />
      );
    }

    if (treeNode.kind === "document") {
      const documentNode = treeNode as typeof treeNode & { kind: "document" };
      return (
        <DocumentRow
          treeNode={documentNode}
          style={style}
          depth={depth}
          isSelected={isSelected}
          editingId={editingId}
          editingName={editingName}
          renameCancelledRef={renameCancelledRef}
          editInputRef={editInputRef}
          setEditingId={setEditingId}
          setEditingName={setEditingName}
          openRowMenuId={openRowMenuId}
          setOpenRowMenuId={setOpenRowMenuId}
          onItemSelect={onItemSelect}
          handleDelete={handleDelete}
          handleRenameConfirm={handleRenameConfirm}
          setRowRef={setRowRef}
        />
      );
    }

    return (
      <div style={style}>
        <ExplorerRow
          rowRef={(el) => setRowRef(treeNode.rawId, el)}
          depth={depth}
          selected={isSelected}
          className="sidebar-row--card"
          onClick={() => {
            if (treeNode.kind === "card") {
              onItemSelect({ type: "card", id: treeNode.rawId });
            }
          }}
        >
          <div className={EXPLORER_ROW_CONTENT_CLASS}>
            <span className="mr-1 size-4 shrink-0" />
            <FileText
              className="mr-2 h-4 w-4 shrink-0 text-[var(--sidebar-text-muted,#6e6e80)]"
              style={{ transform: "translateY(-1px)" }}
            />
            <div
              className={cn(EXPLORER_ROW_TITLE_SLOT_CLASS, "overflow-hidden")}
            >
              <ExplorerRowContent
                title={treeNode.name}
                titleClassName={cn(
                  FOLDER_ROW_TITLE_CLASS,
                  isSelected ? "font-medium" : "font-normal",
                )}
              />
            </div>
          </div>
        </ExplorerRow>
      </div>
    );
  },
);
