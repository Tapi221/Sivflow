import { buildEntityRenameDeleteMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import type { ExplorerTreeNode as TreeNode } from "@/components/folder/explorer/tree/arboristAdapter";
import { cn } from "@/lib/utils";
import { FileText } from "@/ui/icons";
import React from "react";
import { ExplorerRow } from "./ExplorerRow";
import { ExplorerRowContent } from "./ExplorerRowContent";
import { SidebarTreeRow } from "./SidebarTreeRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_INPUT_CLASS,
  EXPLORER_ROW_LEADING_SLOT_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "./shared";

type ExplorerItemType = "folder" | "cardSet" | "card" | "document";

interface RenameTarget {
  id: string;
  type: ExplorerItemType;
}

interface DocumentRowProps {
  treeNode: TreeNode & { kind: "document" };
  style: React.CSSProperties;
  depth: number;
  isSelected: boolean;
  editingId: string | null;
  editingName: string;
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
  handleDelete: (id: string, type: ExplorerItemType) => void;
  handleRenameConfirm: (target?: RenameTarget) => Promise<void>;
  setRowRef: (id: string, node: HTMLElement | null) => void;
}

export const DocumentRow = ({
  treeNode,
  style,
  depth,
  isSelected,
  editingId,
  editingName,
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
        handleDelete,
      }),
    [
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
        // no-op
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
        className={cn(
          "cursor-pointer sidebar-row--folder",
          isSelected
            ? "bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text,#202123)]"
            : "hover:bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text,#202123)]",
        )}
        onClick={(event) => {
          if (event.defaultPrevented) return;
          onItemSelect({ type: "document", id: treeNode.rawId });
        }}
      >
        <div className={cn(EXPLORER_ROW_CONTENT_CLASS, "cursor-pointer")}>
          <div className={EXPLORER_ROW_LEADING_SLOT_CLASS} />

          <span className={EXPLORER_ROW_ICON_SLOT_CLASS}>
            <FileText
              className={cn(
                "sidebar-icon",
                FOLDER_ROW_ICON_SIZE_CLASS,
                FOLDER_ROW_ICON_MUTED_CLASS,
                isSelected && FOLDER_ROW_ICON_ACTIVE_CLASS,
              )}
            />
          </span>

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
                setEditingName(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                const isComposing =
                  e.nativeEvent.isComposing || e.keyCode === 229;

                if (e.key === "Enter" && isComposing) return;

                if (e.key === "Enter") {
                  e.preventDefault();
                  setEditingName(e.currentTarget.value);
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
                setEditingName(e.currentTarget.value);
                void handleRenameConfirm({
                  id: treeNode.rawId,
                  type: "document",
                });
              }}
            />
          ) : (
            <div className={EXPLORER_ROW_TITLE_SLOT_CLASS}>
              <ExplorerRowContent
                title={treeNode.name}
                titleClassName={cn(
                  "lining-nums tabular-nums",
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