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
}: RootFolderPanelListProps) {
  return (
    <div className="h-full overflow-y-auto px-1 py-1">
      {rootFolderPanels.map((folder) => (
        <div
          key={folder.id}
          className={cn(
            "group relative w-full h-8 rounded-[4px] px-2 text-left flex items-center cursor-pointer",
            "hover:bg-[var(--sidebar-hover-bg,#f3f4f6)]",
            selectedFolderId === folder.id && "bg-[var(--sidebar-active-bg,#e7ebef)]",
          )}
          role="button"
          tabIndex={0}
          onClick={() => onSelectFolder(folder.id)}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectFolder(folder.id);
            }
          }}
        >
          <div className="flex items-center gap-1.5 pr-8 min-w-0">
            <FolderIcon
              className={cn(
                "h-4 w-4 shrink-0",
                selectedFolderId === folder.id ? "text-[#4b5563]" : "text-[#6e7280]",
              )}
            />
            <span
              className={cn(
                "truncate text-[14px] text-[#1f2328]",
                selectedFolderId === folder.id ? "font-medium" : "font-normal",
              )}
            >
              {folder.name}
            </span>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <ContextMenu
              open={openRowMenuId === `folder:${folder.id}:panel`}
              onOpenChange={(open) =>
                setOpenRowMenuId(
                  open
                    ? `folder:${folder.id}:panel`
                    : (prev) =>
                        prev === `folder:${folder.id}:panel` ? null : prev,
                )
              }
              type="folder"
              onCreateSubfolder={() => void handleCreateFolderAction(folder.id)}
              onCreateCard={() => void handleCreateCardAction(folder.id)}
              onRename={() => {
                setEditingId(folder.id);
                setEditingName(folder.name);
              }}
              onDelete={() => handleDelete(folder.id, "folder")}
              isPinned={
                pinnedItems?.some(
                  (item) => item.type === "folder" && item.id === folder.id,
                ) ?? false
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
                  "pointer-events-auto h-7 w-7 grid place-items-center rounded-md text-[#6E6E80] hover:text-[#202123] hover:bg-slate-200",
                  "opacity-0 group-hover:opacity-100",
                  openRowMenuId === `folder:${folder.id}:panel` && "opacity-100",
                )}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </ContextMenu>
          </div>
        </div>
      ))}
    </div>
  );
}




