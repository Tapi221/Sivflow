import React, { useMemo, useState } from 'react';
import type { Card, Folder } from '../../types';
import { Input } from '../ui/input';
import { Search, Sparkles, Menu as ListIcon, Folder as FolderIcon, ChevronDown, BookOpen } from 'lucide-react';
import { getRecommendedCards } from '../../utils/recommendation';
import { useFolders } from '../../hooks/useFolders';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface HandTrayProps {
    folderId?: string;
    placedCardIds?: string[];
    allCards?: Card[];
    onCardDragStart?: (card: Card) => void;
    onCardDrop?: (cardId: string, source?: string) => void;
    className?: string;
}

export const HandTray: React.FC<HandTrayProps> = ({ 
  folderId, 
  placedCardIds = [],
  allCards = [],
  onCardDragStart,
  onCardDrop,
  className 
}) => {
  const { folders } = useFolders();
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'all' | 'recommended'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');

  // Filter folders to only descendants of current folderId
  const availableFolders = useMemo(() => {
    if (!folderId) return folders;

    const getDescendants = (rootId: string): string[] => {
        let ids = [rootId];
        const children = folders.filter(f => (f.parentFolderId ?? (f as any).parent_folder_id) === rootId);
        children.forEach(child => {
            ids = [...ids, ...getDescendants(child.id)];
        });
        return ids;
    };

    const allowedIds = getDescendants(folderId);
    return folders.filter(f => allowedIds.includes(f.id));
  }, [folders, folderId]);

  const trayCards = useMemo(() => {
     // 1. Filter out placed
     let available = (allCards as any[]).filter(c => !placedCardIds.includes(c.id));

     // 2. Filter by Folder if selected
     if (selectedFolderId !== 'all') {
         available = available.filter(c => c.folderId === selectedFolderId);
     }

     if (mode === 'recommended') {
         // Context is placed cards
         const context = (allCards as any[]).filter(c => placedCardIds.includes(c.id));
         return getRecommendedCards(available, context, 10) as any[];
     }

     // Normal Search Mode
      if (searchTerm.trim()) {
          const lower = searchTerm.toLowerCase();
          return available.filter(c => 
              c.questionText.toLowerCase().includes(lower) || 
              ((c.tags as any[]) && (c.tags as any[]).some((t: any) => typeof t === 'string' ? t.toLowerCase().includes(lower) : t.name.toLowerCase().includes(lower)))
          );
      }
      
      return available;
  }, [allCards, placedCardIds, searchTerm, mode, selectedFolderId]);

  const selectedFolderName = useMemo(() => {
      if (selectedFolderId === 'all') return 'すべてのフォルダ';
      const f = folders.find(f => f.id === selectedFolderId || f.folderId === selectedFolderId);
      return f?.folderName || '不明なフォルダ';
  }, [selectedFolderId, folders]);

  const handleDragOver = (e: React.DragEvent) => {
      // 1. 必ず preventDefault を呼ぶ
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
      // 1. 必ず preventDefault を呼ぶ
      e.preventDefault();
      e.stopPropagation();

      // 2. dataTransfer から "application/x-flashcard-node" を読み取る
      const raw = e.dataTransfer.getData('application/x-flashcard-node');
      if (!raw) return;

      try {
          // 5. cardId / nodeId の取り違えを防ぐためパース処理を整理
          const parsed = JSON.parse(raw);
          const { cardId, source } = parsed;

          // 3. source === "map" の場合のみ処理を実行 (マップからトレイへの戻し)
          if (cardId && source === 'map' && onCardDrop) {
              onCardDrop(cardId, source);
          }
      } catch (err) {
          console.error('Failed to parse dropped card data:', err);
      }
  };

  return (
    <div className={cn("hand-tray flex flex-col bg-white/90 backdrop-blur-sm border-t border-slate-200", className)}>
        {/* Tray Header / Filter */}
        <div className="flex items-center justify-between p-2 px-4 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setMode('all')}
                    className={cn(
                        "text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full transition-all whitespace-nowrap",
                        mode === 'all' ? "text-primary-700 bg-primary-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <ListIcon className="w-3 h-3 inline mr-1" /> すべて
                </button>
                <button 
                    onClick={() => setMode('recommended')}
                    className={cn(
                        "text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full transition-all whitespace-nowrap",
                        mode === 'recommended' ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-indigo-400 hover:bg-slate-50"
                    )}
                >
                    <Sparkles className="w-3 h-3 inline mr-1" /> AIピック
                </button>

                <div className="w-[1px] h-3 bg-slate-200 mx-1 hidden sm:block"></div>

                {/* Folder Selector */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1 border border-slate-100 bg-white">
                            <FolderIcon className="w-3 h-3" />
                            <span className="max-w-[80px] md:max-w-[120px] truncate">{selectedFolderName}</span>
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto min-w-[180px]">
                        <DropdownMenuItem onClick={() => setSelectedFolderId('all')} className="text-xs font-bold">
                             すべてのフォルダ
                        </DropdownMenuItem>
                        {availableFolders.length > 0 && <div className="h-[1px] bg-slate-100 my-1"></div>}
                        {availableFolders.map(f => (
                            <DropdownMenuItem 
                                key={f.id} 
                                onClick={() => setSelectedFolderId(f.id)}
                                className={cn("text-xs", selectedFolderId === f.id && "bg-primary-50 text-primary-600 font-bold")}
                            >
                                <FolderIcon className="w-3 h-3 mr-2 opacity-50" />
                                {f.folderName}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex items-center gap-3 ml-auto">
                {mode === 'all' && (
                    <div className="relative w-32 md:w-48">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <Input 
                            className="h-7 pl-7 text-[10px] md:text-xs bg-slate-50 border-slate-200 rounded-full" 
                            placeholder="カードを検索..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
                {mode === 'recommended' && (
                    <div className="text-[10px] text-slate-400 italic">
                        現在の配置に基づき推薦
                    </div>
                )}
            </div>
        </div>

        {/* Cards Scroll Area */}
        <div 
            className="flex gap-3 overflow-x-auto p-4 min-h-[160px] no-scrollbar"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
          {trayCards.map(card => (
            <div 
                key={card.id} 
                className="tray-card min-w-[110px] w-[110px] h-[130px] bg-white border border-slate-100 rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:translate-y-[-4px] hover:shadow-md hover:border-primary-100 transition-all select-none flex flex-col relative group"
                draggable
                onDragStart={(e) => {
                    const payload = JSON.stringify({ cardId: card.id, source: 'tray' });
                    e.dataTransfer.setData('text/plain', card.id);
                    e.dataTransfer.setData('application/x-flashcard-node', payload);
                    if (onCardDragStart) onCardDragStart(card as any);
                }}
            >
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full hidden group-hover:block bg-primary-400 animate-pulse"></div>
              <div className="text-[11px] font-bold text-slate-700 line-clamp-4 mb-auto leading-relaxed">
                  {card.questionText}
              </div>
              {card.tags && card.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[9px] px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full border border-slate-100/50 truncate max-w-full">
                          {typeof card.tags[0] === 'string' ? card.tags[0] : card.tags[0].name}
                      </span>
                  </div>
              )}
            </div>
          ))}
          {trayCards.length === 0 && (
              <div className="text-xs text-slate-400 w-full flex flex-col items-center justify-center py-4 gap-2 border-2 border-dashed border-slate-100 rounded-2xl mx-4">
                  <BookOpen className="w-8 h-8 opacity-10" />
                  <span className="font-bold opacity-60">カードがありません</span>
                  {(searchTerm || selectedFolderId !== 'all') && (
                      <span className="text-[10px] text-slate-300">検索条件やフォルダ設定を変更してみてください</span>
                  )}
              </div>
          )}
        </div>
    </div>
  );
};

