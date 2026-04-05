import { buildEntityRenameDeleteMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { cn } from "@/lib/utils";
import { FileText } from "@/ui/icons";
import React from "react";
import type { ExplorerTreeNode as TreeNode } from "../tree/arboristAdapter";
import { ExplorerRow } from "./ExplorerRow";
import { ExplorerRowContent } from "./ExplorerRowContent";
import { SidebarTreeRow } from "./SidebarTreeRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_INPUT_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "./shared";

interface DocumentRowProps {
  treeNode: TreeNode & { kind: "document" };
  style: React.CSSProperties;
  depth: number;
  isSelected: boolean;
  editingId: string | null;
  editingName: string;
  editingNameRef: React.MutableRefObject<string>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  editInputRef: React.MutableRefObject<HTMLInputElement | null>;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  openRowMenuId: string | null;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  onItemSelect: (item: {
    type: "card" | "cardSet" | "document";
    id: string;
  }) => void;
  handleDelete: (
    id: string,
    type: "folder" | "cardSet" | "card" | "document",
  ) => void;
  handleRenameConfirm: (target?: any) => Promise<void>;
  setRowRef: (id: string, node: HTMLElement | null) => void;
}

export const DocumentRow = ({
  treeNode,
  style,
  depth,
  isSelected,
  editingId,
  editingName,
  editingNameRef,
  renameCancelledRef,
  editInputRef,
  setEditingId,
  setEditingName,
  openRowMenuId,
  setOpenRowMenuId,
  onItemSelect,
  handleDelete,
  handleRenameConfirm,
  setRowRef,
}: DocumentRowProps) => {
  const rowMenuId = `document:${treeNode.rawId}`;
  const isRowMenuOpen = openRowMenuId === rowMenuId;
  const isEditing = editingId === treeNode.rawId;

  const rowMenuActions = React.useMemo(
    () =>
      buildEntityRenameDeleteMenuActions({
        id: treeNode.rawId,
        name: treeNode.name,
        type: "document",
        beforeRename: () => {
          onItemSelect({ type: "document", id: treeNode.rawId });
        },
        closeMenu: () => {
          setOpenRowMenuId(null);
        },
        setEditingId,
        setEditingName,
        editingNameRef,
        handleDelete,
      }),
    [
      editingNameRef,
      handleDelete,
      onItemSelect,
      setEditingId,
      setEditingName,
      setOpenRowMenuId,
      treeNode.name,
      treeNode.rawId,
    ],
  );

  const attachEditInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      editInputRef.current = node;
      if (!node || !isEditing) return;
      node.focus({ preventScroll: true });
      node.select();
      try {
        node.setSelectionRange(0, node.value.length);
      } catch {
        // no-op: setSelectionRange をサポートしない環境がある
      }
    },
    [editInputRef, isEditing],
  );

  return (
    <SidebarTreeRow
      style={style}
      menuOpen={isRowMenuOpen}
      onMenuOpenChange={(open) => {
        setOpenRowMenuId(open ? rowMenuId : null);
      }}
      menuActions={rowMenuActions}
      hasContextMenu
      isEditing={isEditing}
      onContextMenuSelect={() => {
        onItemSelect({ type: "document", id: treeNode.rawId });
      }}
    >
      <ExplorerRow
        rowRef={(el) => setRowRef(treeNode.rawId, el)}
        depth={depth}
        selected={isSelected}
        className="sidebar-row--document"
        onClick={(event) => {
          if (event.defaultPrevented) return;
          onItemSelect({ type: "document", id: treeNode.rawId });
        }}
      >
        <div className={EXPLORER_ROW_CONTENT_CLASS}>
          <span className="mr-1 size-4 shrink-0" />
          <FileText
            className="mr-2 h-4 w-4 shrink-0 text-[var(--sidebar-text-muted,#6e6e80)]"
            style={{ transform: "translateY(-1px)" }}
          />
          {isEditing ? (
            <input
              ref={attachEditInputRef}
              aria-label="文書名の編集"
              className={EXPLORER_ROW_INPUT_CLASS}
              defaultValue={editingName}
              onFocus={(e) => {
                e.currentTarget.select();
              }}
              onMouseUp={(e) => {
                e.preventDefault();
              }}
              onChange={(e) => {
                editingNameRef.current = e.target.value;
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                const isComposing =
                  e.nativeEvent.isComposing || e.keyCode === 229;
                if (e.key === "Enter" && isComposing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  editingNameRef.current = e.currentTarget.value;
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  renameCancelledRef.current = true;
                  e.currentTarget.blur();
                }
              }}
              onBlur={(e) => {
                editingNameRef.current = e.currentTarget.value;
                void handleRenameConfirm({
                  id: treeNode.rawId,
                  type: "document",
                });
              }}
            />
          ) : (
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
          )}
        </div>
      </ExplorerRow>
    </SidebarTreeRow>
  );
};