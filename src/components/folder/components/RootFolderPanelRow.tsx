import {
  ExplorerChromeCardSetIcon,
  ExplorerChromeCardIcon,
  ExplorerChromeFolderIcon,
  ExplorerChromePdfIcon,
  ExplorerChromePinIcon,
} from "@/components/explorer/icons";
import {
  buildEntityRenameDeleteMenuActions,
  buildFolderMenuActions,
} from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { beginInlineRename } from "@/components/folder/components/menus/explorerMenuStateHelpers";
import type { MenuAction } from "@/components/folder/components/menus/menuActions";
import { SidebarEntityRow } from "@/components/folder/explorer/rows/SidebarEntityRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_INPUT_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import type { SelectedExplorerItem } from "@/types";
import React from "react";
import type { NavigationListEntry } from "./RootFolderPanelList";

type RenameTarget = {
  id: string;
  type: "folder" | "cardSet" | "card" | "document";
};

interface RootFolderPanelRowProps {
  entry: NavigationListEntry;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  openRowMenuId: string | null;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectFolder: (folderId: string | null) => void;
  onItemSelect: (item: {
    type: "card" | "cardSet" | "document";
    id: string;
  }) => void;
  canCreateFolder: boolean;
  canCreateCardSet: boolean;
  canRenameFolder: boolean;
  canDeleteFolder: boolean;
  canRenameCardSet: boolean;
  canDeleteCardSet: boolean;
  canRenameDocument: boolean;
  canDeleteDocument: boolean;
  handleCreateFolderAction: (parentId: string | null) => string;
  handleCreateCardSetAction: (folderId: string | null) => string | null;
  handleDelete: (
    id: string,
    type: "folder" | "cardSet" | "card" | "document",
  ) => void;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  editingId: string | null;
  editingName: string;
  editingNameRef: React.MutableRefObject<string>;
  handleRenameConfirm: (target?: RenameTarget) => Promise<void>;
  attachInputRef: (node: HTMLInputElement | null) => void;
}

const hasSelectedItemId = (
  item: SelectedExplorerItem,
): item is Extract<SelectedExplorerItem, { id: string }> => {
  return item !== null && "id" in item;
};

export const RootFolderPanelRow = ({
  entry,
  selectedFolderId,
  selectedItem,
  selectedCardSetId = null,
  openRowMenuId,
  setRowRef,
  setOpenRowMenuId,
  onSelectFolder,
  onItemSelect,
  canCreateFolder,
  canCreateCardSet,
  canRenameFolder,
  canDeleteFolder,
  canRenameCardSet,
  canDeleteCardSet,
  canRenameDocument,
  canDeleteDocument,
  handleCreateFolderAction,
  handleCreateCardSetAction,
  handleDelete,
  setEditingId,
  setEditingName,
  renameCancelledRef,
  editingId,
  editingName,
  editingNameRef,
  handleRenameConfirm,
  attachInputRef,
}: RootFolderPanelRowProps) => {
  const pinnedFolderIds = useExplorerStore((state) => state.pinnedFolderIds);
  const togglePinnedFolder = useExplorerStore(
    (state) => state.togglePinnedFolder,
  );

  const supportsContextMenuKind =
    entry.kind === "folder" ||
    entry.kind === "cardSet" ||
    entry.kind === "document";

  const menuId = supportsContextMenuKind
    ? `${entry.kind}:${entry.id}:panel`
    : null;
  const isEditing = supportsContextMenuKind && editingId === entry.id;
  const isMenuOpen = menuId !== null && openRowMenuId === menuId;
  const isCreateDraft =
    entry.kind === "folder" &&
    Boolean((entry.folder as { __optimistic?: boolean }).__optimistic);
  const createDraftIdRef = React.useRef<string | null>(null);
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isEditing && isCreateDraft) {
      createDraftIdRef.current = entry.id;
      return;
    }

    if (!isEditing && createDraftIdRef.current === entry.id) {
      createDraftIdRef.current = null;
    }
  }, [entry.id, isCreateDraft, isEditing]);

  const attachRenameInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      renameInputRef.current = node;
      attachInputRef(node);
    },
    [attachInputRef],
  );

  const isSelected =
    entry.kind === "folder"
      ? selectedFolderId === entry.id
      : entry.kind === "cardSet"
        ? selectedCardSetId === entry.id ||
          (hasSelectedItemId(selectedItem) &&
            selectedItem.type === "cardSet" &&
            selectedItem.id === entry.id)
        : hasSelectedItemId(selectedItem) &&
          selectedItem.type === entry.kind &&
          selectedItem.id === entry.id;

  const isFolderPinned =
    entry.kind === "folder" && pinnedFolderIds.includes(entry.id);

  const Icon =
    entry.kind === "folder"
      ? ExplorerChromeFolderIcon
      : entry.kind === "cardSet"
        ? ExplorerChromeCardSetIcon
        : entry.kind === "card"
          ? ExplorerChromeCardIcon
          : ExplorerChromePdfIcon;

  const closeMenu = React.useCallback(() => {
    setOpenRowMenuId(null);
  }, [setOpenRowMenuId]);

  const handleSelect = React.useCallback(() => {
    if (isEditing || isMenuOpen) return;

    if (entry.kind === "folder") {
      onSelectFolder(entry.id);
      return;
    }

    onItemSelect({ type: entry.kind, id: entry.id });
  }, [entry, isEditing, isMenuOpen, onItemSelect, onSelectFolder]);

  const handleContextMenuSelect = React.useCallback(() => {
    if (isEditing || isMenuOpen) return;

    // ルート一覧の folder は onSelectFolder が「選択」ではなく
    // ナビゲーション遷移を伴うため、右クリック時には呼ばない。
    if (entry.kind === "folder") return;

    onItemSelect({ type: entry.kind, id: entry.id });
  }, [entry, isEditing, isMenuOpen, onItemSelect]);

  const handleTogglePinnedFolder = React.useCallback(() => {
    if (entry.kind !== "folder") return;
    togglePinnedFolder(entry.id);
  }, [entry.id, entry.kind, togglePinnedFolder]);

  const handleRenameBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const nextValue = input.value;
      editingNameRef.current = nextValue;

      const nextTarget = event.relatedTarget;
      const isCreateButtonFocus =
        nextTarget instanceof HTMLElement &&
        Boolean(nextTarget.closest("[data-sidebar-create-root-folder-button='true']"));
      const isBodyFocus =
        nextTarget === null ||
        nextTarget === document.body ||
        nextTarget === document.documentElement;
      const shouldKeepCreateDraftOpen =
        createDraftIdRef.current === entry.id &&
        entry.kind === "folder" &&
        (isCreateButtonFocus || isBodyFocus);

      if (shouldKeepCreateDraftOpen) {
        window.requestAnimationFrame(() => {
          const node = renameInputRef.current;
          if (!node || !node.isConnected) return;
          if (document.activeElement === node) return;
          node.focus({ preventScroll: true });
          node.select();
        });
        return;
      }

      void handleRenameConfirm({
        id: entry.id,
        type: entry.kind,
      });
    },
    [editingNameRef, entry.id, entry.kind, handleRenameConfirm],
  );

  const folderMenuActions = React.useMemo(
    () =>
      entry.kind === "folder"
        ? buildFolderMenuActions({
            onCreateSubfolder: canCreateFolder
              ? () => {
                  void handleCreateFolderAction(entry.id);
                }
              : undefined,
            onCreateCardSet: canCreateCardSet
              ? () => {
                  void handleCreateCardSetAction(entry.id);
                }
              : undefined,
            onRename: canRenameFolder
              ? () => {
                  beginInlineRename({
                    id: entry.id,
                    name: entry.name,
                    closeMenu,
                    setEditingId,
                    setEditingName,
                  });
                }
              : undefined,
            onDelete: canDeleteFolder
              ? () => {
                  handleDelete(entry.id, "folder");
                }
              : undefined,
          })
        : [],
    [
      canCreateCardSet,
      canCreateFolder,
      canDeleteFolder,
      canRenameFolder,
      closeMenu,
      entry,
      handleCreateCardSetAction,
      handleCreateFolderAction,
      handleDelete,
      setEditingId,
      setEditingName,
    ],
  );

  const pinMenuActions = React.useMemo<MenuAction[]>(
    () =>
      entry.kind === "folder"
        ? [
            {
              id: isFolderPinned ? "unpin-folder" : "pin-folder",
              label: isFolderPinned ? "ピン留めを外す" : "ピン留めする",
              icon: <ExplorerChromePinIcon className="h-4 w-4" />,
              onSelect: handleTogglePinnedFolder,
            },
          ]
        : [],
    [entry.kind, handleTogglePinnedFolder, isFolderPinned],
  );

  const resolvedMenuActions = React.useMemo(() => {
    if (entry.kind === "folder") {
      return [...pinMenuActions, ...folderMenuActions];
    }

    if (entry.kind === "cardSet") {
      return buildEntityRenameDeleteMenuActions({
        id: entry.id,
        name: entry.name,
        type: "cardSet",
        beforeRename: () => {
          onItemSelect({ type: "cardSet", id: entry.id });
        },
        closeMenu,
        setEditingId,
        setEditingName,
        canRename: canRenameCardSet,
        onDelete: canDeleteCardSet
          ? (id, type) => {
              handleDelete(id, type);
            }
          : undefined,
      });
    }

    if (entry.kind === "document") {
      return buildEntityRenameDeleteMenuActions({
        id: entry.id,
        name: entry.name,
        type: "document",
        beforeRename: () => {
          onItemSelect({ type: "document", id: entry.id });
        },
        closeMenu,
        setEditingId,
        setEditingName,
        canRename: canRenameDocument,
        onDelete: canDeleteDocument
          ? (id, type) => {
              handleDelete(id, type);
            }
          : undefined,
      });
    }

    return [];
  }, [
    canDeleteCardSet,
    canDeleteDocument,
    canRenameCardSet,
    canRenameDocument,
    closeMenu,
    entry,
    folderMenuActions,
    handleDelete,
    onItemSelect,
    pinMenuActions,
    setEditingId,
    setEditingName,
  ]);

  const hasContextMenu = resolvedMenuActions.length > 0;

  const contentCount =
    entry.kind === "folder" || entry.kind === "cardSet"
      ? entry.contentCount
      : undefined;

  const contentCountNode =
    typeof contentCount === "number" ? (
      <span className="ds-list-item__subtitle text-[11px] font-normal tabular-nums leading-none opacity-60">
        {contentCount}
      </span>
    ) : null;

  const trailingNode =
    contentCountNode ? (
      <div className="ml-auto flex shrink-0 items-center gap-1 pr-1">
        {contentCountNode}
      </div>
    ) : null;

  return (
    <SidebarEntityRow
      menuOpen={isMenuOpen}
      onMenuOpenChange={(open) => {
        setOpenRowMenuId(open && menuId ? menuId : null);
      }}
      menuActions={resolvedMenuActions}
      hasContextMenu={hasContextMenu}
      contextMenuVariant={entry.kind === "folder" ? "folderContext" : "default"}
      isEditing={isEditing}
      onContextMenuSelect={handleContextMenuSelect}
      rowRef={(node) => setRowRef(entry.id, node)}
      selected={isSelected}
      contentClassName={EXPLORER_ROW_CONTENT_CLASS}
      iconClassName={EXPLORER_ROW_ICON_SLOT_CLASS}
      titleSlotClassName={EXPLORER_ROW_TITLE_SLOT_CLASS}
      title={entry.name}
      titleClassName={cn(
        FOLDER_ROW_TITLE_CLASS,
        isSelected ? "font-medium" : "font-normal",
      )}
      trailing={trailingNode}
      icon={
        <Icon
          className={cn(
            FOLDER_ROW_ICON_SIZE_CLASS,
          )}
        />
      }
      input={
        <input
          ref={attachRenameInputRef}
          className={cn(
            EXPLORER_ROW_INPUT_CLASS,
            "h-7 min-w-0 w-full rounded-[5px] border border-[#a8a176] bg-white px-2",
            "text-[12px] text-[#24231f] shadow-[0_0_0_2px_rgba(168,161,118,0.18)] outline-none",
            "placeholder:text-muted-foreground/55",
          )}
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
          value={editingName}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onMouseUp={(e) => {
            e.preventDefault();
          }}
          onChange={(e) => {
            const nextName = e.target.value;
            editingNameRef.current = nextName;
            setEditingName(nextName);
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            const isComposing = e.nativeEvent.isComposing || e.keyCode === 229;

            if (e.key === "Enter" && isComposing) return;

            if (e.key === "Enter") {
              e.preventDefault();
              editingNameRef.current = e.currentTarget.value;
              void handleRenameConfirm({
                id: entry.id,
                type: entry.kind,
              });
              return;
            }

            if (e.key === "Escape") {
              e.preventDefault();
              renameCancelledRef.current = true;
              setEditingId(null);
              setEditingName("");
            }
          }}
          onBlur={handleRenameBlur}
        />
      }
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        handleSelect();
      }}
      onKeyDown={(e) => {
        if (isEditing || isMenuOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
    />
  );
};
