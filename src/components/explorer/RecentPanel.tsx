/**
 * RecentPanel - 最近開いた履歴表示コンポーネント
 */
import { ExplorerRow } from "@/components/folder/explorer/rows/ExplorerRow";
import { ExplorerRowContent } from "@/components/folder/explorer/rows/ExplorerRowContent";
import type { RecentItem } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import {
  BookOpen,
  Clock,
  FileText,
  Folder as FolderIcon,
  Trash2,
} from "@/ui/icons";
import { useMemo } from "react";

interface RecentPanelProps {
  recent: RecentItem[];
  folders: Folder[];
  cards: Card[];
  documents?: DocumentItem[];
  onFolderSelect: (folderId: string) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onClearRecent: () => void;
}

const getRelativeTime = (ts: number) => {
  const now = Date.now();
  const diff = now - ts;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  return new Date(ts).toLocaleDateString("ja-JP");
};

export const RecentPanel = ({
  recent,
  folders,
  cards,
  documents = [],
  onFolderSelect,
  onItemSelect,
  onClearRecent,
}: RecentPanelProps) => {
  const validRecent = useMemo(() => {
    return recent.filter((rec) => {
      if (rec.type === "folder") {
        return folders.some(
          (folder) => String(folder.id || folder.folderId) === rec.id,
        );
      }
      if (rec.type === "card") {
        return cards.some(
          (card) => card.id === rec.id || card.cardId === rec.id,
        );
      }
      if (rec.type === "document") {
        return documents.some(
          (doc) => doc.id === rec.id || doc.documentId === rec.id,
        );
      }
      return false;
    });
  }, [recent, folders, cards, documents]);

  const getItemInfo = (item: RecentItem) => {
    if (item.type === "folder") {
      const folder = folders.find(
        (entry) => String(entry.id || entry.folderId) === item.id,
      );
      return {
        name: folder?.folderName || "不明なフォルダ",
        icon: FolderIcon,
      };
    }
    if (item.type === "card") {
      const card = cards.find(
        (entry) => entry.id === item.id || entry.cardId === item.id,
      );
      return {
        name: card?.title || "無題のカード",
        icon: BookOpen,
      };
    }
    const doc = documents.find(
      (entry) => entry.id === item.id || entry.documentId === item.id,
    );
    return {
      name: doc?.title || "無題のドキュメント",
      icon: FileText,
    };
  };

  const handleClick = (item: RecentItem) => {
    if (item.type === "folder") {
      onFolderSelect(item.id);
    } else if (item.type === "card") {
      onItemSelect({ type: "card", id: item.id });
    } else if (item.type === "document") {
      onItemSelect({ type: "document", id: item.id });
    }
  };

  if (validRecent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-[#6E6E80]">
        <Clock className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">履歴がありません</p>
        <p className="text-xs mt-1">
          フォルダやカードを開くと履歴に追加されます
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <span className="text-xs font-medium text-[#6E6E80]">
          最近開いたアイテム
        </span>
        <button
          onClick={onClearRecent}
          className="text-xs text-[#6E6E80] hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>クリア</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {validRecent.map((item) => {
          const info = getItemInfo(item);
          const Icon = info.icon;

          return (
            <ExplorerRow
              key={`${item.type}:${item.id}:${item.ts}`}
              depth={1}
              className="cursor-pointer"
              onClick={() => handleClick(item)}
            >
              <ExplorerRowContent
                left={
                  <Icon
                    className={cn(
                      "sidebar-icon w-4 h-4 shrink-0 mr-2",
                      item.type === "folder"
                        ? "text-[#E8A858]"
                        : item.type === "document"
                          ? "text-rose-500"
                          : "text-[#6E6E80]",
                    )}
                  />
                }
                title={info.name}
                right={
                  <span className="text-[10px] text-[#6E6E80] shrink-0">
                    {getRelativeTime(item.ts)}
                  </span>
                }
              />
            </ExplorerRow>
          );
        })}
      </div>
    </div>
  );
};
