/**
 * RecentPanel - 最近開いた履歴表示コンポーネント
 */
import React, { useMemo } from 'react';
import { Folder, FileText, BookOpen, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecentItem } from '@/hooks/useExplorerStore';
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from '@/types';

interface RecentPanelProps {
  recent: RecentItem[];
  folders: Folder[];
  cards: Card[];
  documents?: DocumentItem[]; // ✅追加
  onFolderSelect: (folderId: string) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onClearRecent: () => void;
}

// 相対時刻を生成
function getRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  return new Date(ts).toLocaleDateString('ja-JP');
}

export function RecentPanel({
  recent,
  folders,
  cards,
  documents = [],
  onFolderSelect,
  onItemSelect,
  onClearRecent,
}: RecentPanelProps) {
  // 有効な履歴のみフィルタリング（削除済みを除外）
  const validRecent = useMemo(() => {
    return recent.filter(rec => {
      if (rec.type === 'folder') {
        return folders.some(f => (f.id || f.folderId) === rec.id);
      }
      if (rec.type === 'card') {
        return cards.some(c => c.id === rec.id || c.cardId === rec.id);
      }
      if (rec.type === 'document') {
        return documents.some(d => d.id === rec.id || d.documentId === rec.id);
      }
      return false;
    });
  }, [recent, folders, cards, documents]);

  // アイテム情報を取得
  const getItemInfo = (item: RecentItem) => {
    if (item.type === 'folder') {
      const folder = folders.find(f => (f.id || f.folderId) === item.id);
      return {
        name: folder?.folderName || '不明なフォルダ',
        icon: Folder,
      };
    } else if (item.type === 'card') {
      const card = cards.find(c => c.id === item.id || c.cardId === item.id);
      return {
        name: card?.title || '無題のカード',
        icon: BookOpen,
      };
    } else {
      const doc = documents.find(d => d.id === item.id || d.documentId === item.id);
      return {
        name: doc?.title || '無題のドキュメント',
        icon: FileText,
      };
    }
  };

  const handleClick = (item: RecentItem) => {
    if (item.type === 'folder') {
      onFolderSelect(item.id);
    } else if (item.type === 'card') {
      onItemSelect({ type: 'card', id: item.id });
    } else if (item.type === 'document') {
      onItemSelect({ type: 'document', id: item.id });
    }
  };

  if (validRecent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
        <Clock className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">履歴がありません</p>
        <p className="text-xs mt-1">フォルダやカードを開くと履歴に追加されます</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500">最近開いたアイテム</span>
        <button
          onClick={onClearRecent}
          className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>クリア</span>
        </button>
      </div>
      
      {/* リスト */}
      <div className="flex-1 overflow-y-auto py-1">
        {validRecent.map((item) => {
          const info = getItemInfo(item);
          const Icon = info.icon;
          
          return (
            <div
              key={`${item.type}:${item.id}:${item.ts}`}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
              onClick={() => handleClick(item)}
            >
              <Icon className={cn(
                "w-4 h-4 shrink-0",
                item.type === 'folder' ? "text-[#E8A858]" : item.type === 'document' ? "text-rose-500" : "text-slate-400"
              )} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700 truncate">
                  {info.name}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {getRelativeTime(item.ts)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
