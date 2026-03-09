import { ContextMenu } from "@/components/folder/components/menus/ContextMenu";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { cn } from "@/lib/utils";
import { Folder as FolderIcon, MoreVertical } from "@/ui/icons";
import React from "react";

interface RootFolderPanelListProps {
  rootFolderPanels: Array<{ id: string; name: string; folder: FolderTreeNode }>;
  selectedFolderId: string | null;
  openRowMenuId: string | null;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectFolder: (folderId: string) => void;
  handleCreateFolderAction: (parentId: string | null) => void;
  handleCreateCardAction: (folderId: string | null) => void;
  handleDelete: (id: string, type: "folder" | "card") => void;
  pinnedItems?: Array<{ type: "folder" | "card" | "document"; id: string }>;
  onPinItem?: (item: { type: "folder" | "card" | "document"; id: string }) => void;
  onUnpinItem?: (item: { type: "folder" | "card" | "document"; id: string }) => void;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  editingId: string | null;
  editingName: string;
  handleRenameConfirm: () => Promise<void>;
}

export function RootFolderPanelList({
  rootFolderPanels,
  selectedFolderId,
  openRowMenuId,
  setOpenRowMenuId,
  onSelectFolder,
  handleCreateFolderAction,
  handleCreateCardAction,
  handleDelete,
  pinnedItems,
  onPinItem,
  onUnpinItem,
  setEditingId,
  setEditingName,
  editingId,
  editingName,
  handleRenameConfirm,
}: RootFolderPanelListProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!editingId) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;

      input.focus();

      raf2 = requestAnimationFrame(() => {
        const finalInput = inputRef.current;
        if (!finalInput) return;

        finalInput.focus();
        finalInput.select();
        finalInput.setSelectionRange(0, finalInput.value.length);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [editingId]);

  return (
    <div className="h-full overflow-y-auto px-1 py-1">
      {rootFolderPanels.map((folder) => {
        const isEditing = editingId === folder.id;
        const isMenuOpen = openRowMenuId === `folder:${folder.id}:panel`;

        return (
          <div
            key={folder.id}
            className={cn(
              "group relative w-full h-8 rounded-[4px] px-2 text-left flex items-center cursor-pointer",
              "hover:bg-[var(--sidebar-active-bg,#e7ebef)]",
              selectedFolderId === folder.id && "bg-[var(--sidebar-active-bg,#e7ebef)]",
            )}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (isEditing) return;
              if (isMenuOpen) return;
              onSelectFolder(folder.id);
            }}
            onKeyDown={(e) => {
              if (isEditing) return;
              if (isMenuOpen) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectFolder(folder.id);
              }
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5 pr-8">
              <FolderIcon
                className={cn(
                  "h-4 w-4 shrink-0",
                  selectedFolderId === folder.id
                    ? "text-[var(--sidebar-text,#202123)]"
                    : "text-[var(--sidebar-text-muted,#6e6e80)]",
                )}
              />
              {isEditing ? (
                <input
                  ref={inputRef}
                  className="h-6 w-full rounded border border-slate-300 bg-white px-1 text-[14px] text-[#1f2328] outline-none select-text"
                  style={{ userSelect: "text", WebkitUserSelect: "text" }}
                  value={editingName}
                  onFocus={(e) => {
                    e.currentTarget.select();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                  }}
                  onChange={(e) => setEditingName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleRenameConfirm();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingId(null);
                      setEditingName("");
                    }
                  }}
                  onBlur={() => void handleRenameConfirm()}
                />
              ) : (
                <span
                  className={cn(
                    "truncate text-[14px] text-[var(--sidebar-text,#202123)]",
                    selectedFolderId === folder.id ? "font-medium" : "font-normal",
                  )}
                >
                  {folder.name}
                </span>
              )}
            </div>

            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <ContextMenu
                open={isMenuOpen}
                onOpenChange={(open) =>
                  setOpenRowMenuId(
                    open
                      ? `folder:${folder.id}:panel`
                      : (prev) => (prev === `folder:${folder.id}:panel` ? null : prev),
                  )
                }
                type="folder"
                onCreateSubfolder={() => void handleCreateFolderAction(folder.id)}
                onCreateCard={() => void handleCreateCardAction(folder.id)}
                onRename={() => {
                  const forceSelectRenameInput = () => {
                    const input = inputRef.current;
                    if (!input) return;
                    input.focus({ preventScroll: true });
                    input.select();
                    try {
                      input.setSelectionRange(0, input.value.length);
                    } catch {}
                  };
                  setEditingId(folder.id);
                  setEditingName(folder.name);
                  requestAnimationFrame(() => {
                    forceSelectRenameInput();
                    requestAnimationFrame(() => {
                      forceSelectRenameInput();
                    });
                  });
                  window.setTimeout(() => {
                    forceSelectRenameInput();
                  }, 40);
                }}
                onDelete={() => handleDelete(folder.id, "folder")}
                isPinned={
                  pinnedItems?.some((item) => item.type === "folder" && item.id === folder.id) ??
                  false
                }
                onTogglePin={() => {
                  const isPinned =
                    pinnedItems?.some(
                      (item) => item.type === "folder" && item.id === folder.id,
                    ) ?? false;

                  if (isPinned) onUnpinItem?.({ type: "folder", id: folder.id });
                  else onPinItem?.({ type: "folder", id: folder.id });
                }}
              >
                <button
                  type="button"
                  aria-label="フォルダメニューを開く"
                  className={cn(
                    "pointer-events-auto grid h-7 w-7 place-items-center rounded-md text-[var(--sidebar-text-muted,#6e6e80)] hover:bg-[var(--sidebar-active-bg,#e7ebef)] hover:text-[var(--sidebar-text,#202123)]",
                    "opacity-0 group-hover:opacity-100",
                    isMenuOpen && "opacity-100",
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </ContextMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}

