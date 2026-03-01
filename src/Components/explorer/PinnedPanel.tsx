/**
 * PinnedPanel - ピン留め一覧表示コンポーネント
 */
import React, { useMemo, useState } from 'react';
import { Folder, BookOpen, FileText, ChevronRight, ChevronDown, X } from 'lucide-react';
import Pin from 'lucide-react/dist/esm/icons/pin';
import { cn } from '@/lib/utils';
import type { PinnedItem } from '@/hooks/useExplorerStore';
import type { Card, DocumentItem, SelectedExplorerItem } from '@/types';

interface PinnedPanelProps {
  pinnedItems: PinnedItem[];
  folders: any[];
  cards: Card[];
  documents?: DocumentItem[];
  onFolderSelect: (folderId: string) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onUnpinItem: (item: PinnedItem) => void;
  // フォルダパス取得用
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // 有効なピン留めのみフィルタリング（削除済みを除外）
  const validPinnedItems = useMemo(() => {
    return pinnedItems.filter((item) => {
      if (item.type === 'folder') {
        return folders.some(f => (f.id || f.folderId) === item.id);
      }
      if (item.type === 'card') {
        return cards.some(c => c.id === item.id);
      }
      if (item.type === 'document') {
        return documents.some(d => d.id === item.id);
      }
      return false;
    });
  }, [pinnedItems, folders, cards, documents]);

  const folderById = useMemo(() => {
    const map = new Map<string, any>();
    folders.forEach((folder) => {
      const id = String(folder.id || folder.folderId || '');
      if (!id) return;
      map.set(id, folder);
    });
    return map;
  }, [folders]);

  const folderChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    folders.forEach((folder) => {
      const id = String(folder.id || folder.folderId || '');
      if (!id) return;
      const parentId = String(folder.parentId || folder.parentFolderId || '');
      const key = parentId || '__root__';
      const list = map.get(key) ?? [];
      list.push(id);
      map.set(key, list);
    });
    for (const ids of map.values()) {
      ids.sort((a, b) => {
        const fa = folderById.get(a);
        const fb = folderById.get(b);
        const oa = Number(fa?.orderIndex ?? fa?.order_index ?? 0);
        const ob = Number(fb?.orderIndex ?? fb?.order_index ?? 0);
        return oa - ob;
      });
    }
    return map;
  }, [folders, folderById]);

  const itemsByFolderId = useMemo(() => {
    const map = new Map<string, Array<{ type: 'card' | 'document'; id: string; orderIndex: number }>>();
    cards.forEach((card) => {
      const folderId = String(card.folderId || (card as any).folder_id || '');
      if (!folderId) return;
      const list = map.get(folderId) ?? [];
      list.push({ type: 'card', id: card.id, orderIndex: Number(card.orderIndex ?? (card as any).order_index ?? 0) });
      map.set(folderId, list);
    });
    documents.forEach((doc) => {
      const folderId = String(doc.folderId || (doc as any).folder_id || '');
      if (!folderId) return;
      const list = map.get(folderId) ?? [];
      list.push({ type: 'document', id: doc.id, orderIndex: Number(doc.orderIndex ?? (doc as any).order_index ?? 0) });
      map.set(folderId, list);
    });
    for (const list of map.values()) {
      list.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return map;
  }, [cards, documents]);

  const pinnedFolderIds = useMemo(
    () => validPinnedItems.filter((item) => item.type === 'folder').map((item) => item.id),
    [validPinnedItems]
  );

  const pinnedFolderIdSet = useMemo(() => new Set(pinnedFolderIds), [pinnedFolderIds]);

  const pinnedRootFolderIds = useMemo(() => {
    const isDescendantOfPinned = (folderId: string): boolean => {
      let current = folderById.get(folderId);
      while (current) {
        const parentId = String(current.parentId || current.parentFolderId || '');
        if (!parentId) return false;
        if (pinnedFolderIdSet.has(parentId)) return true;
        current = folderById.get(parentId);
      }
      return false;
    };
    return pinnedFolderIds.filter((id) => !isDescendantOfPinned(id));
  }, [pinnedFolderIds, pinnedFolderIdSet, folderById]);

  const isPinnedFolder = (folderId: string) => pinnedFolderIdSet.has(folderId);

  // アイテム情報を取得
  const getItemInfo = (item: PinnedItem) => {
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
        icon: BookOpen,
      };
    } else if (item.type === 'document') {
      const doc = documents.find((d) => d.id === item.id);
      const docFolder = doc?.folderId
        ? folders.find(f => (f.id || f.folderId) === doc.folderId)
        : null;
      return {
        name: doc?.title || doc?.fileName || '無題のドキュメント',
        path: docFolder ? (docFolder.folderName || docFolder.folder_name) : '',
        icon: FileText,
      };
    }
    return { name: '', path: '', icon: BookOpen };
  };

  const handleClick = (item: PinnedItem) => {
    if (item.type === 'folder') {
      onFolderSelect(item.id);
    } else if (item.type === 'card') {
      onItemSelect({ type: 'card', id: item.id });
    } else if (item.type === 'document') {
      onItemSelect({ type: 'document', id: item.id });
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
    const folderName = folder.folderName || folder.folder_name || '無題のフォルダ';
    const childFolderIds = folderChildrenMap.get(folderId) ?? [];
    const folderItems = itemsByFolderId.get(folderId) ?? [];
    const hasChildren = childFolderIds.length > 0 || folderItems.length > 0;
    const isExpanded = expandedFolders.has(folderId);
    const showUnpin = depth === 0 && isPinnedFolder(folderId);

    return (
      <div key={`folder-subtree:${folderId}`}>
        <div
          className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
          style={{ paddingLeft: `${12 + depth * 12}px` }}
          onClick={() => onFolderSelect(folderId)}
        >
          {hasChildren ? (
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center text-slate-500"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folderId);
              }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4 h-4 shrink-0" />
          )}
          <Folder className="w-4 h-4 shrink-0 text-[#E8A858]" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-700 truncate">{folderName}</div>
          </div>
          {showUnpin ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnpinItem({ type: 'folder', id: folderId });
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          ) : null}
        </div>

        {isExpanded ? (
          <>
            {childFolderIds.map((id) => renderSubtree(id, depth + 1))}
            {folderItems.map((entry) => {
              if (entry.type === 'card') {
                const card = cards.find((c) => c.id === entry.id);
                const isPinned = validPinnedItems.some((item) => item.type === 'card' && item.id === entry.id);
                return (
                  <div
                    key={`card-in-folder:${entry.id}`}
                    className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
                    style={{ paddingLeft: `${12 + (depth + 1) * 12}px` }}
                    onClick={() => onItemSelect({ type: 'card', id: entry.id })}
                  >
                    <BookOpen className="w-4 h-4 shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate">{card?.title || '無題のカード'}</div>
                    </div>
                    {isPinned ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnpinItem({ type: 'card', id: entry.id });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                      >
                        <X className="w-3 h-3 text-slate-400" />
                      </button>
                    ) : null}
                  </div>
                );
              }

              const doc = documents.find((d) => d.id === entry.id);
              const isPinned = validPinnedItems.some((item) => item.type === 'document' && item.id === entry.id);
              return (
                <div
                  key={`doc-in-folder:${entry.id}`}
                  className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
                  style={{ paddingLeft: `${12 + (depth + 1) * 12}px` }}
                  onClick={() => onItemSelect({ type: 'document', id: entry.id })}
                >
                  <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{doc?.title || doc?.fileName || '無題のドキュメント'}</div>
                  </div>
                  {isPinned ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpinItem({ type: 'document', id: entry.id });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="py-1">
      <div
        className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
        onClick={() => onItemSelect({ type: 'today-study' })}
      >
        <Pin className="w-4 h-4 shrink-0 text-primary-600 fill-primary-100" strokeWidth={2.2} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">今日の学習</div>
        </div>
      </div>
      <div
        className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
        onClick={() => onItemSelect({ type: 'gallery' })}
      >
        <Pin className="w-4 h-4 shrink-0 text-primary-600 fill-primary-100" strokeWidth={2.2} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">ギャラリー</div>
        </div>
      </div>
      <div
        className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
        onClick={() => onItemSelect({ type: 'calendar' })}
      >
        <Pin className="w-4 h-4 shrink-0 text-primary-600 fill-primary-100" strokeWidth={2.2} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">予定表</div>
        </div>
      </div>
      <div
        className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
        onClick={() => onItemSelect({ type: 'settings' })}
      >
        <Pin className="w-4 h-4 shrink-0 text-primary-600 fill-primary-100" strokeWidth={2.2} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">設定</div>
        </div>
      </div>
      <div
        className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
        onClick={() => onItemSelect({ type: 'trash' })}
      >
        <Pin className="w-4 h-4 shrink-0 text-primary-600 fill-primary-100" strokeWidth={2.2} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">ごみ箱</div>
        </div>
      </div>

      {validPinnedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
          <Pin className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">ピン留めがありません</p>
          <p className="text-xs mt-1">フォルダやカードを右クリックして追加</p>
        </div>
      ) : null}

      {pinnedRootFolderIds.map((folderId) => renderSubtree(folderId, 0))}

      {validPinnedItems.filter((item) => item.type !== 'folder').map((item) => {
        const info = getItemInfo(item);
        const Icon = info.icon;
        
        return (
          <div
            key={`${item.type}:${item.id}`}
            className="group flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
            onClick={() => handleClick(item)}
          >
            <Icon className={cn(
              "w-4 h-4 shrink-0",
              item.type === 'folder' ? "text-[#E8A858]" : "text-slate-400"
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
                onUnpinItem(item);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
