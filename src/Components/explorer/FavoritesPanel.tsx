/**
 * FavoritesPanel - ピン留め一覧表示コンポーネント
 */
import React, { useMemo } from 'react';
import { Folder, FileText, Bookmark, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FavoriteItem } from '@/hooks/useExplorerStore';
import type { Card, DocumentItem, SelectedExplorerItem } from '@/types';

interface FavoritesPanelProps {
  favorites: FavoriteItem[];
  folders: any[];
  cards: Card[];
  documents?: DocumentItem[];
  onFolderSelect: (folderId: string) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onRemoveFavorite: (item: FavoriteItem) => void;
  // フォルダパス取得用
  getFolderPath?: (folderId: string) => string;
}

export function FavoritesPanel({
  favorites,
  folders,
  cards,
  documents = [],
  onFolderSelect,
  onItemSelect,
  onRemoveFavorite,
  getFolderPath,
}: FavoritesPanelProps) {
  // 有効なお気に入りのみフィルタリング（削除済みを除外）
  const validFavorites = useMemo(() => {
    return favorites.filter(fav => {
      if (fav.type === 'folder') {
        return folders.some(f => (f.id || f.folderId) === fav.id);
      }
      if (fav.type === 'card') {
        return cards.some(c => c.id === fav.id);
      }
      if (fav.type === 'document') {
        return documents.some(d => d.id === fav.id);
      }
      return false;
    });
  }, [favorites, folders, cards, documents]);

  // アイテム情報を取得
  const getItemInfo = (item: FavoriteItem) => {
    if (item.type === 'folder') {
      const folder = folders.find(f => (f.id || f.folderId) === item.id);
      return {
        name: folder?.folderName || folder?.folder_name || '不明なフォルダ',
        path: getFolderPath ? getFolderPath(item.id) : '',
        icon: Folder,
      };
    } else if (item.type === 'card') {
      const card = cards.find(c => c.id === item.id);
      const cardFolder = card?.folderId 
        ? folders.find(f => (f.id || f.folderId) === card.folderId)
        : null;
      return {
        name: card?.title || '無題のカード',
        path: cardFolder ? (cardFolder.folderName || cardFolder.folder_name) : '',
        icon: FileText,
      };
    }
  };

  const handleClick = (item: FavoriteItem) => {
    if (item.type === 'folder') {
      onFolderSelect(item.id);
    } else if (item.type === 'card') {
      onItemSelect({ type: 'card', id: item.id });
    } else if ((item.type as string) === 'pdf') {
      onItemSelect({ type: 'document', id: item.id });
    }
  };

  if (validFavorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
        <Bookmark className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">お気に入りがありません</p>
        <p className="text-xs mt-1">フォルダやカードを右クリックして追加</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {validFavorites.map((item) => {
        const info = getItemInfo(item);
        const Icon = info.icon;
        
        return (
          <div
            key={`${item.type}:${item.id}`}
            className="group flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 cursor-pointer transition-colors"
            onClick={() => handleClick(item)}
          >
            <Icon className={cn(
              "w-4 h-4 shrink-0",
              item.type === 'folder' ? "text-amber-500" : "text-slate-400"
            )} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate">
                {info.name}
              </div>
              {info.path && (
                <div className="text-[10px] text-slate-400 truncate">
                  {info.path}
                </div>
              )}
            </div>
            {/* 削除ボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFavorite(item);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
              title="お気に入りから削除"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
