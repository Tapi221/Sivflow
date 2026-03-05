/**
 * PinnedPanel - ピン留め一覧表示コンポーネント
 */
import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  FolderTree,
  Globe,
  Home,
  Settings,
  Trash2,
  X,
} from "@/ui/icons";
import { cn } from "@/lib/utils";
import { ExplorerRow } from "@/components/folder/explorer/rows/ExplorerRow";
import { ExplorerRowContent } from "@/components/folder/explorer/rows/ExplorerRowContent";
import type { PinnedItem } from "@/hooks/useExplorerStore";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";

type LegacyCardFields = {
  folder_id?: string;
};

type CardLike = Card & LegacyCardFields;

interface PinnedPanelProps {
  pinnedItems: PinnedItem[];
  folders: Folder[];
  cards: Card[];
  documents?: DocumentItem[];
  onFolderSelect: (folderId: string) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onUnpinItem: (item: PinnedItem) => void;
  getFolderPath?: (folderId: string) => string;
}

export function PinnedPanel({
  pinnedItems,
  folders,
  cards,
  documents = [],
  onFolderSelect,
  onItemSelect,
  onUnpinItem,
  getFolderPath,
}: PinnedPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  const validPinnedItems = useMemo(() => {
    return pinnedItems.filter((item) => {
      if (item.type === "folder") {
        return folders.some(
          (folder) => String(folder.id || folder.folderId) === item.id,
        );
      }
      if (item.type === "card") {
        return cards.some((card) => card.id === item.id);
      }
      if (item.type === "document") {
        return documents.some((doc) => doc.id === item.id);
      }
      return false;
    });
  }, [pinnedItems, folders, cards, documents]);

  const folderById = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach((folder) => {
      const id = String(folder.id || folder.folderId || "");
      if (!id) return;
      map.set(id, folder);
    });
    return map;
  }, [folders]);

  const folderChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    folders.forEach((folder) => {
      const id = String(folder.id || folder.folderId || "");
      if (!id) return;
      const parentId = String(folder.parentFolderId || "");
      const key = parentId || "__root__";
      const list = map.get(key) ?? [];
      list.push(id);
      map.set(key, list);
    });
    for (const ids of map.values()) {
      ids.sort((a, b) => {
        const fa = folderById.get(a);
        const fb = folderById.get(b);
        const oa = Number(fa?.orderIndex ?? 0);
        const ob = Number(fb?.orderIndex ?? 0);
        return oa - ob;
      });
    }
    return map;
  }, [folders, folderById]);

  const itemsByFolderId = useMemo(() => {
    const map = new Map<
      string,
      Array<{ type: "card" | "document"; id: string; orderIndex: number }>
    >();
    cards.forEach((card) => {
      const folderId = String(
        (card as CardLike).folderId || (card as CardLike).folder_id || "",
      );
      if (!folderId) return;
      const list = map.get(folderId) ?? [];
      list.push({
        type: "card",
        id: card.id,
        orderIndex: Number(card.orderIndex ?? 0),
      });
      map.set(folderId, list);
    });
    documents.forEach((doc) => {
      const folderId = String(doc.folderId || "");
      if (!folderId) return;
      const list = map.get(folderId) ?? [];
      list.push({
        type: "document",
        id: doc.id,
        orderIndex: Number(doc.orderIndex ?? 0),
      });
      map.set(folderId, list);
    });
    for (const list of map.values()) {
      list.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return map;
  }, [cards, documents]);

  const pinnedFolderIds = useMemo(
    () =>
      validPinnedItems
        .filter((item) => item.type === "folder")
        .map((item) => item.id),
    [validPinnedItems],
  );

  const pinnedFolderIdSet = useMemo(
    () => new Set(pinnedFolderIds),
    [pinnedFolderIds],
  );

  const pinnedRootFolderIds = useMemo(() => {
    const isDescendantOfPinned = (folderId: string): boolean => {
      let current = folderById.get(folderId);
      while (current) {
        const parentId = String(current.parentFolderId || "");
        if (!parentId) return false;
        if (pinnedFolderIdSet.has(parentId)) return true;
        current = folderById.get(parentId);
      }
      return false;
    };
    return pinnedFolderIds.filter((id) => !isDescendantOfPinned(id));
  }, [pinnedFolderIds, pinnedFolderIdSet, folderById]);

  const isPinnedFolder = (folderId: string) => pinnedFolderIdSet.has(folderId);

  const getItemInfo = (item: PinnedItem) => {
    if (item.type === "folder") {
      const folder = folders.find(
        (entry) => String(entry.id || entry.folderId) === item.id,
      );
      return {
        name: folder?.folderName || "不明なフォルダ",
        path: getFolderPath ? getFolderPath(item.id) : "",
        icon: FolderIcon,
      };
    }
    if (item.type === "card") {
      const card = cards.find((entry) => entry.id === item.id);
      const cardFolder = card?.folderId
        ? folders.find(
            (entry) => String(entry.id || entry.folderId) === card.folderId,
          )
        : null;
      return {
        name: card?.title || "無題のカード",
        path: cardFolder?.folderName ?? "",
        icon: BookOpen,
      };
    }
    const doc = documents.find((entry) => entry.id === item.id);
    const docFolder = doc?.folderId
      ? folders.find(
          (entry) => String(entry.id || entry.folderId) === doc.folderId,
        )
      : null;
    return {
      name: doc?.title || doc?.fileName || "無題のドキュメント",
      path: docFolder?.folderName ?? "",
      icon: FileText,
    };
  };

  const handleClick = (item: PinnedItem) => {
    if (item.type === "folder") {
      onFolderSelect(item.id);
    } else if (item.type === "card") {
      onItemSelect({ type: "card", id: item.id });
    } else if (item.type === "document") {
      onItemSelect({ type: "document", id: item.id });
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const renderSubtree = (folderId: string, depth: number) => {
    const folder = folderById.get(folderId);
    if (!folder) return null;
    const folderName = folder.folderName || "無題のフォルダ";
    const childFolderIds = folderChildrenMap.get(folderId) ?? [];
    const folderItems = itemsByFolderId.get(folderId) ?? [];
    const hasChildren = childFolderIds.length > 0 || folderItems.length > 0;
    const isExpanded = expandedFolders.has(folderId);
    const showUnpin = depth === 0 && isPinnedFolder(folderId);

    return (
      <div key={`folder-subtree:${folderId}`}>
        <ExplorerRow
          depth={depth + 1}
          className="cursor-pointer"
          onClick={() => onFolderSelect(folderId)}
        >
          <ExplorerRowContent
            left={
              <>
                {hasChildren ? (
                  <button
                    type="button"
                    className="sidebar-action w-4 h-4 mr-1 flex items-center justify-center text-[#6E6E80] group-hover:text-[#202123]"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(folderId);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="sidebar-icon w-4 h-4" />
                    ) : (
                      <ChevronRight className="sidebar-icon w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-4 h-4 mr-1 shrink-0" />
                )}
                <FolderIcon className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-[#6E6E80] group-hover:text-[#202123]" />
              </>
            }
            title={folderName}
            right={
              showUnpin ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpinItem({ type: "folder", id: folderId });
                  }}
                  className="sidebar-action opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                >
                  <X className="sidebar-icon w-3 h-3 text-[#6E6E80]" />
                </button>
              ) : null
            }
          />
        </ExplorerRow>

        {isExpanded ? (
          <>
            {childFolderIds.map((id) => renderSubtree(id, depth + 1))}
            {folderItems.map((entry) => {
              if (entry.type === "card") {
                const card = cards.find((item) => item.id === entry.id);
                const isPinned = validPinnedItems.some(
                  (item) => item.type === "card" && item.id === entry.id,
                );
                return (
                  <ExplorerRow
                    key={`card-in-folder:${entry.id}`}
                    depth={depth + 2}
                    className="cursor-pointer"
                    onClick={() => onItemSelect({ type: "card", id: entry.id })}
                  >
                    <ExplorerRowContent
                      left={
                        <BookOpen className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-[#6E6E80] group-hover:text-[#202123]" />
                      }
                      title={card?.title || "無題のカード"}
                      right={
                        isPinned ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnpinItem({ type: "card", id: entry.id });
                            }}
                            className="sidebar-action opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                          >
                            <X className="sidebar-icon w-3 h-3 text-[#6E6E80]" />
                          </button>
                        ) : null
                      }
                    />
                  </ExplorerRow>
                );
              }

              const doc = documents.find((item) => item.id === entry.id);
              const isPinned = validPinnedItems.some(
                (item) => item.type === "document" && item.id === entry.id,
              );
              return (
                <ExplorerRow
                  key={`doc-in-folder:${entry.id}`}
                  depth={depth + 2}
                  className="cursor-pointer"
                  onClick={() =>
                    onItemSelect({ type: "document", id: entry.id })
                  }
                >
                  <ExplorerRowContent
                    left={
                      <FileText className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-[#6E6E80] group-hover:text-[#202123]" />
                    }
                    title={doc?.title || doc?.fileName || "無題のドキュメント"}
                    right={
                      isPinned ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnpinItem({ type: "document", id: entry.id });
                          }}
                          className="sidebar-action opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                        >
                          <X className="sidebar-icon w-3 h-3 text-[#6E6E80]" />
                        </button>
                      ) : null
                    }
                  />
                </ExplorerRow>
              );
            })}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="py-1">
      <ExplorerRow
        depth={1}
        className="cursor-pointer"
        onClick={() => onItemSelect({ type: "today-study" })}
      >
        <ExplorerRowContent
          left={
            <Home className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-primary-600" />
          }
          title="今日の学習"
        />
      </ExplorerRow>
      <ExplorerRow
        depth={1}
        className="cursor-pointer"
        onClick={() => onItemSelect({ type: "directory" })}
      >
        <ExplorerRowContent
          left={
            <FolderTree className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-primary-600" />
          }
          title="ディレクトリ"
        />
      </ExplorerRow>
      <ExplorerRow
        depth={1}
        className="cursor-pointer"
        onClick={() => onItemSelect({ type: "gallery" })}
      >
        <ExplorerRowContent
          left={
            <Globe className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-primary-600" />
          }
          title="ギャラリー"
        />
      </ExplorerRow>
      <ExplorerRow
        depth={1}
        className="cursor-pointer"
        onClick={() => onItemSelect({ type: "calendar" })}
      >
        <ExplorerRowContent
          left={
            <Calendar className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-primary-600" />
          }
          title="予定表"
        />
      </ExplorerRow>
      <ExplorerRow
        depth={1}
        className="cursor-pointer"
        onClick={() => onItemSelect({ type: "settings" })}
      >
        <ExplorerRowContent
          left={
            <Settings className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-primary-600" />
          }
          title="設定"
        />
      </ExplorerRow>
      <ExplorerRow
        depth={1}
        className="cursor-pointer"
        onClick={() => onItemSelect({ type: "trash" })}
      >
        <ExplorerRowContent
          left={
            <Trash2 className="sidebar-icon w-4 h-4 mr-2 shrink-0 text-primary-600" />
          }
          title="ごみ箱"
        />
      </ExplorerRow>

      {validPinnedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-12 text-[#6E6E80]">
          <FolderTree className="w-10 h-10 mb-3 text-foreground/40" />
          <p className="text-sm font-medium">ピン留めがありません</p>
          <p className="text-xs mt-1">フォルダやカードを右クリックして追加</p>
        </div>
      ) : null}

      {pinnedRootFolderIds.map((folderId) => renderSubtree(folderId, 0))}

      {validPinnedItems
        .filter((item) => item.type !== "folder")
        .map((item) => {
          const info = getItemInfo(item);
          const Icon = info.icon;

          return (
            <ExplorerRow
              key={`${item.type}:${item.id}`}
              depth={1}
              className="cursor-pointer"
              onClick={() => handleClick(item)}
            >
              <ExplorerRowContent
                left={
                  <Icon
                    className={cn(
                      "sidebar-icon w-4 h-4 mr-2 shrink-0",
                      "text-[#6E6E80] group-hover:text-[#202123]",
                    )}
                  />
                }
                title={info.name}
                subtitle={info.path}
                right={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpinItem(item);
                    }}
                    className="sidebar-action opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                  >
                    <X className="sidebar-icon w-3 h-3 text-[#6E6E80]" />
                  </button>
                }
              />
            </ExplorerRow>
          );
        })}
    </div>
  );
}
