import { buildRenameDeleteMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Layers } from "@/ui/icons";
import React from "react";
import type { ExplorerTreeNode as TreeNode } from "../tree/arboristAdapter";
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

interface CardSetRowProps {
  treeNode: TreeNode & { kind: "cardSet" };
  style: React.CSSProperties;
  isOpen: boolean;
  isSelected: boolean;
  toggle: () => void;
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

export const CardSetRow = ({
  treeNode,
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
  openRowMenuId,
  setOpenRowMenuId,
  onItemSelect,
  handleDelete,
  handleRenameConfirm,
  setRowRef,
}: CardSetRowProps) => {
  const rowMenuId = `cardSet:${treeNode.rawId}`;
  const isRowMenuOpen = openRowMenuId === rowMenuId;
  const isEditing = editingId === treeNode.rawId;
  const hasChildren = (treeNode.children?.length ?? 0) > 0;
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  const rowMenuActions = React.useMemo(
    () =>
      buildRenameDeleteMenuActions({
        onRename: () => {
          onItemSelect({ type: "cardSet", id: treeNode.rawId });
          setOpenRowMenuId(null);
          setEditingId(treeNode.rawId);
          setEditingName(treeNode.name);
          editingNameRef.current = treeNode.name;
        },
        onDelete: () => {
          handleDelete(treeNode.rawId, "cardSet");
        },
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
        onItemSelect({ type: "cardSet", id: treeNode.rawId });
      }}
    >
      <ExplorerRow
        rowRef={(el) => setRowRef(treeNode.rawId, el)}
        depth={0}
        selected={isSelected}
        className={cn(
          "cursor-pointer sidebar-row--folder",
          isSelected
            ? "bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text,#202123)]"
            : "hover:bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text,#202123)]",
        )}
        onClick={() => {
          onItemSelect({ type: "cardSet", id: treeNode.rawId });
        }}
      >
        <div className={cn(EXPLORER_ROW_CONTENT_CLASS, "cursor-pointer")}>
          <div className={EXPLORER_ROW_LEADING_SLOT_CLASS}>
            {hasChildren ? (
              <button
                type="button"
                className="grid h-4 w-4 place-items-center"
                onClick={(event) => {
                  event.stopPropagation();
                  toggle();
                }}
                aria-label={
                  isOpen ? "カードセットを折りたたむ" : "カードセットを展開する"
                }
              >
                <Chevron
                  className={cn(
                    "sidebar-icon",
                    FOLDER_ROW_ICON_SIZE_CLASS,
                    FOLDER_ROW_ICON_MUTED_CLASS,
                    isSelected && FOLDER_ROW_ICON_ACTIVE_CLASS,
                  )}
                />
              </button>
            ) : null}
          </div>

          <span className={EXPLORER_ROW_ICON_SLOT_CLASS}>
            <Layers
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
              aria-label="カードセット名の編集"
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
                  type: "cardSet",
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
                right={
                  hasChildren ? (
                    <span className="ml-auto text-[10px] text-[var(--sidebar-text-muted,#6e6e80)] tabular-nums">
                      {treeNode.children!.length}
                    </span>
                  ) : null
                }
              />
            </div>
          )}
        </div>
      </ExplorerRow>
    </SidebarTreeRow>
  );
};
