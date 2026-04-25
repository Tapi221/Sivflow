import type { MenuAction } from "@/components/folder/components/menus/menuActions";
import {
  getFolderId,
  type FolderTreeNode,
} from "@/components/folder/explorer/model/utils";
import { SidebarEntityRow } from "@/components/folder/explorer/rows/SidebarEntityRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import type { Card, CardSet, DocumentItem, Folder } from "@/types";
import { FolderOutlineIcon, Pin } from "@/ui/icons";
import { useMemo } from "react";

interface PinnedFolderSidebarSectionProps {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  isFiltering: boolean;
  onFolderSelect: (folderId: string) => void;
}

type PinnedFolderEntry = {
  id: string;
  name: string;
  folder: FolderTreeNode;
  contentCount: number;
};

const isSoftDeletedFolder = (folder: FolderTreeNode) => {
  return Boolean(
    (folder as { isDeleted?: boolean; is_deleted?: boolean }).isDeleted ??
      (folder as { isDeleted?: boolean; is_deleted?: boolean }).is_deleted,
  );
};

const isHiddenFolder = (folder: FolderTreeNode) => {
  return Boolean(
    (folder as { isHidden?: boolean; is_hidden?: boolean }).isHidden ??
      (folder as { isHidden?: boolean; is_hidden?: boolean }).is_hidden,
  );
};

const getPinnedFolderName = (folder: FolderTreeNode) => {
  return (
    (folder as { folderName?: string; folder_name?: string }).folderName ??
    (folder as { folderName?: string; folder_name?: string }).folder_name ??
    "無題のフォルダ"
  );
};

export const PinnedFolderSidebarSection = ({
  folders,
  cards,
  cardSets,
  documents,
  selectedFolderId,
  isFiltering,
  onFolderSelect,
}: PinnedFolderSidebarSectionProps) => {
  const pinnedFolderIds = useExplorerStore((state) => state.pinnedFolderIds);
  const unpinFolder = useExplorerStore((state) => state.unpinFolder);

  const treeFolders = folders as unknown as FolderTreeNode[];

  const { getFolderContentCount, matchCountMap } = useExplorerDerivedData({
    treeFolders,
    treeCards: cards,
    cardSets,
    documents,
    isFiltering,
  });

  const folderById = useMemo(() => {
    const map = new Map<string, FolderTreeNode>();

    for (const folder of treeFolders) {
      const id = getFolderId(folder);
      if (!id) continue;
      if (isSoftDeletedFolder(folder) || isHiddenFolder(folder)) continue;
      map.set(id, folder);
    }

    return map;
  }, [treeFolders]);

  const pinnedFolders = useMemo<PinnedFolderEntry[]>(() => {
    return pinnedFolderIds
      .map((folderId) => {
        const folder = folderById.get(folderId);
        if (!folder) return null;

        if (isFiltering && (matchCountMap.get(folderId) ?? 0) <= 0) {
          return null;
        }

        return {
          id: folderId,
          name: getPinnedFolderName(folder),
          folder,
          contentCount: getFolderContentCount(folderId),
        };
      })
      .filter((entry): entry is PinnedFolderEntry => entry !== null);
  }, [
    folderById,
    getFolderContentCount,
    isFiltering,
    matchCountMap,
    pinnedFolderIds,
  ]);

  if (pinnedFolders.length === 0) {
    return null;
  }

  return (
    <section className="shrink-0 border-b border-border/60 pb-1 pt-1">
      <div className="px-3 pb-1 pt-1 text-[11px] font-medium leading-5 text-muted-foreground">
        ピン留め
      </div>

      <div className="space-y-0.5">
        {pinnedFolders.map((entry) => {
          const isSelected = selectedFolderId === entry.id;
          const menuActions: MenuAction[] = [
            {
              id: "unpin-folder",
              label: "ピン留めを外す",
              icon: <Pin className="h-4 w-4" />,
              onSelect: () => unpinFolder(entry.id),
            },
          ];

          return (
            <SidebarEntityRow
              key={entry.id}
              selected={isSelected}
              menuActions={menuActions}
              hasContextMenu
              contextMenuVariant="folderContext"
              contentClassName={EXPLORER_ROW_CONTENT_CLASS}
              iconClassName={EXPLORER_ROW_ICON_SLOT_CLASS}
              titleSlotClassName={EXPLORER_ROW_TITLE_SLOT_CLASS}
              title={entry.name}
              titleClassName={cn(
                FOLDER_ROW_TITLE_CLASS,
                isSelected ? "font-medium" : "font-normal",
              )}
              trailing={
                <div className="ml-auto flex shrink-0 items-center gap-1 pr-1">
                  <span className="ds-list-item__subtitle text-[11px] font-normal tabular-nums leading-none opacity-60">
                    {entry.contentCount}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                      "opacity-70 transition hover:bg-muted hover:text-foreground group-hover:opacity-100",
                    )}
                    aria-label="ピン留めを外す"
                    title="ピン留めを外す"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      unpinFolder(entry.id);
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                </div>
              }
              icon={
                <FolderOutlineIcon
                  className={cn(
                    "sidebar-icon",
                    FOLDER_ROW_ICON_SIZE_CLASS,
                    isSelected
                      ? FOLDER_ROW_ICON_ACTIVE_CLASS
                      : FOLDER_ROW_ICON_MUTED_CLASS,
                  )}
                />
              }
              role="button"
              tabIndex={0}
              onClick={(event) => {
                if (event.defaultPrevented) return;
                onFolderSelect(entry.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFolderSelect(entry.id);
                }
              }}
            />
          );
        })}
      </div>
    </section>
  );
};
