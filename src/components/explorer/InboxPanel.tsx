/**
 * InboxPanel - 未分類カード一覧表示コンポーネント
 */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { BookOpen, Folder, ArrowRight, ChevronRight, ChevronDown } from 'lucide-react';

interface InboxPanelProps {
  cards: unknown[];
  folders: unknown[];
  onCardSelect: (cardId: string) => void;
  onMoveCard: (cardId: string, targetFolderId: string) => Promise<void>;
  recentFolderIds?: string[]; // 最近使ったフォルダID
}

export function InboxPanel({
  cards,
  folders,
  onCardSelect,
  onMoveCard,
  recentFolderIds = [],
}: InboxPanelProps) {
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 未分類カード（folderId が null または undefined）
  const inboxCards = useMemo(() => {
    return cards.filter(c => !c.folderId);
  }, [cards]);

  // 移動先フォルダ候補（最近使ったもの + ルートフォルダ）
  const moveFolderOptions = useMemo(() => {
    const rootFolders = folders.filter(f => !f.parentId);
    const recentFolders = recentFolderIds
      .map(id => folders.find(f => (f.id || f.folderId) === id))
      .filter(Boolean)
      .slice(0, 5);
    
    // 重複を除去
    const seen = new Set<string>();
    const options: unknown[] = [];
    
    for (const f of recentFolders) {
      const id = f.id || f.folderId;
      if (!seen.has(id)) {
        seen.add(id);
        options.push(f);
      }
    }
    
    for (const f of rootFolders) {
      const id = f.id || f.folderId;
      if (!seen.has(id)) {
        seen.add(id);
        options.push(f);
      }
    }
    
    return options.slice(0, 8);
  }, [folders, recentFolderIds]);

  // ドロップダウンを閉じる（外側クリック時）
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMovingCardId(null);
      }
    };
    if (movingCardId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [movingCardId]);

  const handleMoveToFolder = async (cardId: string, folderId: string) => {
    setIsMoving(true);
    try {
      await onMoveCard(cardId, folderId);
      setMovingCardId(null);
    } catch (e) {
      console.error('Failed to move card:', e);
    } finally {
      setIsMoving(false);
    }
  };

  if (inboxCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
        <Folder className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">受信箱は空です</p>
        <p className="text-xs mt-1">未分類のカードがここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500">
          未分類カード ({inboxCards.length})
        </span>
      </div>
      
      {/* リスト */}
      <div className="flex-1 overflow-y-auto py-1">
        {inboxCards.map((card) => {
          const cardId = card.id || card.cardId;
          const isOpen = movingCardId === cardId;
          
          return (
            <div
              key={cardId}
              className="group flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 transition-colors relative"
            >
              {/* カード情報 */}
              <div
                className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                onClick={() => onCardSelect(cardId)}
              >
                <BookOpen className="w-4 h-4 shrink-0 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {card.title || '無題のカード'}
                  </div>
                </div>
              </div>
              
              {/* 移動ボタン + ドロップダウン */}
              <div className="relative" ref={isOpen ? dropdownRef : undefined}>
                <button
                  onClick={() => setMovingCardId(isOpen ? null : cardId)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all flex items-center gap-1 text-xs text-slate-500"
                  disabled={isMoving}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">移動</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {/* ドロップダウンメニュー */}
                {isOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                    <div className="text-xs font-medium text-slate-500 px-3 py-1.5">
                      移動先を選択
                    </div>
                    <div className="border-t border-slate-100">
                      {moveFolderOptions.map((folder) => {
                        const folderId = folder.id || folder.folderId;
                        const folderName = folder.folderName || folder.folder_name;
                        
                        return (
                          <button
                            key={folderId}
                            onClick={() => handleMoveToFolder(cardId, folderId)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 text-left transition-colors"
                            disabled={isMoving}
                          >
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-700 truncate">{folderName}</span>
                          </button>
                        );
                      })}
                      {moveFolderOptions.length === 0 && (
                        <div className="text-xs text-slate-400 px-3 py-2 text-center">
                          フォルダがありません
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
