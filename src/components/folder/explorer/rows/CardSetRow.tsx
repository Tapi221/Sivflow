import { buildEntityRenameDeleteMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import type { ExplorerTreeNode as TreeNode } from "@/components/folder/explorer/tree/arboristAdapter";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Layers } from "@/ui/icons";
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

interface CardSetRowProps {
  treeNode: TreeNode & { kind: "cardSet" };
  style: React.CSSProperties;
  depth: number;
  isOpen: boolean;
  isSelected: boolean;
  toggle: () => void;
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
  handleDelete: (
    id: string,
    type: "folder" | "cardSet" | "card" | "document",
  ) => void;
  handleRenameConfirm: (target?: {
    id: string;
    type: "cardSet";
  }) => Promise<void>;
  setRowRef: (id: string, node: HTMLElement | null) => void;
}

export const CardSetRow = ({
  treeNode,
  style,
  depth,
  isOpen,
  isSelected,
  toggle,
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
}: CardSetRowProps) => {
  const rowMenuId = `cardSet:${treeNode.rawId}`;
  const isRowMenuOpen = openRowMenuId === rowMenuId;
  const isEditing = editingId === treeNode.rawId;
  const hasChildren = (treeNode.children?.length ?? 0) > 0;
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  const rowMenuActions = React.useMemo(
    () =>
      buildEntityRenameDeleteMenuActions({
        id: treeNode.rawId,
        name: treeNode.name,
        type: "cardSet",
        beforeRename: () => {
          onItemSelect({ type: "cardSet", id: treeNode.rawId });
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
        depth={depth}
        selected={isSelected}
        className={cn(
          "cursor-pointer sidebar-row--folder ds-list-item--interactive",
          isSelected
            ? "ds-list-item--selected"
            : "text-[var(--ds-semantic-color-text-primary)]",
        )}
        onClick={(event) => {
          if (event.defaultPrevented) return;
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
                    "sidebar-icon ds-list-item__icon",
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
                "sidebar-icon ds-list-item__icon",
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
                    <span className="ds-list-item__subtitle ml-auto text-[10px] tabular-nums">
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
