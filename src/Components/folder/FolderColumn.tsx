import React from 'react';
import { Plus, ChevronRight, MoreVertical, Pencil, Trash2, BellOff, Bell, Folder, BookOpen, Home, Settings, FileText, Zap, Check, X, Edit, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/Components/ui/checkbox';
import FolderPlusIcon from 'lucide-react/dist/esm/icons/folder-plus';
import { Button } from '@/Components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { Folder as FolderType } from '@/types';

interface FolderColumnProps {
  parentId: string | null;
  parentName: string;
  folders: FolderType[];
  allFolders: FolderType[];
  cards: any[];
  onFolderClick: (folderId: string) => void;
  onCreateCard: (folderId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onEdit: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
  onHide: (folder: FolderType) => void;
  onToggleSilent: (folder: FolderType) => void;
  onSelect?: (folderId: string) => void; // フォルダを開く（中身を表示）
  onCardClick?: (cardId: string) => void; // カードを選択
  onQuickCreateFolder?: (name: string, parentId: string | null) => Promise<void>; // インライン作成用
  selectedFolderId?: string;
  visibleFolderIds?: Set<string> | null;
  selectedTags?: string[]; // 🔥 Add this
  // 複数選択用のプロップス
  isSelectionMode?: boolean;
  selectedFolderIds?: string[];
  onToggleSelection?: (id: string) => void;
}

export default function FolderColumn({
  parentId,
  parentName,
  folders,
  allFolders,
  cards,
  onFolderClick,
  onCreateCard,
  onCreateFolder,
  onEdit,
  onDelete,
  onHide,
  onToggleSilent,
  onSelect,
  onCardClick,
  onQuickCreateFolder,
  selectedFolderId,
  visibleFolderIds,
  selectedTags, // 🔥 Add this
  isSelectionMode,
  selectedFolderIds,
  onToggleSelection,
}: FolderColumnProps) {
  // インライン作成用の状態
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 常に allFolders をソースとして使用
  const sourceFolders = allFolders || folders || [];

  // 現在の親の子フォルダのみをフィルタ
  const childFolders = sourceFolders
    .filter((f) => {
      const isDeleted = f.isDeleted ?? (f as any).is_deleted;
      const pId = f.parentFolderId ?? (f as any).parent_folder_id ?? null;
      const folderId = f.id || f.folderId;
      
      // 基本的な削除・親フォルダチェック
      const isMatch = pId === parentId && (isDeleted === undefined || isDeleted === false);
      if (!isMatch) return false;

      // タグ絞り込みが有効な場合、visibleFolderIds に含まれるかチェック
      if (visibleFolderIds && folderId && !visibleFolderIds.has(folderId)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  // 現在のフォルダの直下にあるカードを抽出
  const childCards = cards.filter(c => {
    const fId = c.folderId || c.folder_id;
    const isDeleted = c.isDeleted || c.is_deleted;
    const isMatch = fId === parentId && !(isDeleted);
    
    if (!isMatch) return false;

    // タグ絞り込みが有効な場合、選択されたタグのいずれかを持っているかチェック
    if (selectedTags && selectedTags.length > 0) {
      const cardTags = c.tags || [];
      return selectedTags.some(tag => cardTags.includes(tag));
    }

    return true;
  });

  // カード数を計算する関数
  const getCardCount = (folderId: string, visited = new Set<string>()): number => {
    if (visited.has(folderId)) return 0;
    visited.add(folderId);
    
    // 直下のカード数をフィルタリングを考慮して計算
    const direct = cards.filter(c => {
        const isMatch = (c.folderId || c.folder_id) === folderId && !(c.isDeleted || c.is_deleted);
        if (!isMatch) return false;
        if (selectedTags && selectedTags.length > 0) {
            const cardTags = c.tags || [];
            return selectedTags.some(tag => cardTags.includes(tag));
        }
        return true;
    }).length;

    const children = sourceFolders.filter(sf => (sf.parentFolderId || (sf as any).parent_folder_id) === folderId && !(sf.isDeleted || (sf as any).is_deleted));
    return direct + children.reduce((sum, child) => sum + getCardCount(child.id || child.folderId, visited), 0);
  };

  // 子フォルダがあるかチェック
  const hasChildren = (folderId: string): boolean => {
    return sourceFolders.some((f) => {
      const pId = f.parentFolderId ?? (f as any).parent_folder_id ?? null;
      const isDeleted = f.isDeleted ?? (f as any).is_deleted;
      return pId === folderId && (isDeleted === undefined || isDeleted === false);
    });
  };

  // 作成実行
  const handleCreateSubmit = async () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      setNewFolderName('');
      return;
    }
    
    try {
      if (onQuickCreateFolder) {
        await onQuickCreateFolder(newFolderName.trim(), parentId);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };

  // 入力フィールドへの自動フォーカス
  React.useEffect(() => {
    if (isCreatingFolder && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingFolder]);

  return (
    <div className="flex flex-col w-64 border-r border-slate-200 h-full bg-white first:rounded-l-xl last:border-r-0">
      {/* カラムヘッダー */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-slate-200 bg-slate-100/50">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[140px]">
          {parentName}
        </span>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              setIsCreatingFolder(true); // ダイアログではなくインライン作成モードへ
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* フォルダリスト */}
      <Droppable droppableId={`column-${parentId}`} type="folder">
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-0.5 custom-scrollbar transition-colors",
              snapshot.isDraggingOver && "bg-primary-50/30"
            )}
          >
        {childFolders.map((folder, index) => {
          const fId = folder.id || folder.folderId;
          const isSelected = selectedFolderId === fId;
          const isSilent = folder.isSilent ?? (folder as any).is_silent;
          const cardCount = getCardCount(fId);
          const hasChild = hasChildren(fId);

          return (
            <Draggable key={fId} draggableId={String(fId)} index={index}>
              {(draggableProvided, draggableSnapshot) => (
                <div
                  ref={draggableProvided.innerRef}
                  {...draggableProvided.draggableProps}
                  {...draggableProvided.dragHandleProps}
                  className={cn(
                    "transition-all duration-200",
                    draggableSnapshot.isDragging && "z-[100]"
                  )}
                >
                  <Droppable droppableId={`drop-${fId}`} type="folder">
                    {(dropProvided, dropSnapshot) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        data-selectable-id={`folder:${fId}`}
                        onClick={() => onFolderClick(fId)}
                        className={cn(
                          "group flex items-center justify-between px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-200 relative",
                          isSelected 
                            ? "bg-primary-600 text-white shadow-md ring-1 ring-primary-700/30" 
                            : "hover:bg-slate-100 text-slate-700 font-medium",
                          draggableSnapshot.isDragging && "bg-primary-500 text-white shadow-xl ring-2 ring-primary-400 scale-[1.02]",
                          dropSnapshot.isDraggingOver && "ring-2 ring-primary-300 ring-offset-1 bg-primary-100/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {isSelectionMode ? (
                            <Checkbox
                              checked={selectedFolderIds?.includes(fId)}
                              onCheckedChange={() => onToggleSelection?.(fId)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5"
                            />
                          ) : (
                            <div className={cn(
                              "p-1 rounded-md flex-shrink-0 transition-colors",
                              (isSelected || draggableSnapshot.isDragging) ? "bg-white/20" : "bg-slate-200 text-primary-600"
                            )}>
                              {(() => {
                                const iconName = (folder as any).folderIcon || 'Folder';
                                const IconComponent = ({
                                  Folder, BookOpen, Home, Settings, FileText, Zap, ChevronRight, Plus, Check, X, Edit, Trash2
                                } as any)[iconName] || Folder;
                                return <IconComponent className="w-3.5 h-3.5" />;
                              })()}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-semibold truncate leading-tight">
                              {folder.folderName || (folder as any).folder_name || '(名称未設定)'}
                            </span>
                            <span className={cn(
                              "text-[9px] font-bold flex-shrink-0",
                              (isSelected || draggableSnapshot.isDragging) ? "text-white/90" : "text-primary-700/70 opacity-80"
                            )}>
                              {cardCount} cards
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {isSilent && (
                            <BellOff className={cn("w-3 h-3 flex-shrink-0", (isSelected || draggableSnapshot.isDragging) ? "text-white/70" : "text-slate-300")} />
                          )}
                          
                          {hasChild && (
                            <ChevronRight className={cn("w-3.5 h-3.5", (isSelected || draggableSnapshot.isDragging) ? "text-white/80" : "text-slate-400")} />
                          )}

                          {/* ホバー時のみ表示されるアクション（カード追加、メニュー） */}
                          <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* エクスプローラと同様のカード追加ボタン */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6 rounded-md",
                                (isSelected || draggableSnapshot.isDragging)
                                  ? "text-white hover:bg-white/20" 
                                  : "text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCreateCard(fId);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={cn(
                                    "h-6 w-6 rounded-md",
                                    (isSelected || draggableSnapshot.isDragging)
                                      ? "text-white hover:bg-white/20" 
                                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-xl border-slate-100 shadow-xl">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect?.(fId);
                                  }}
                                  className="rounded-lg text-xs"
                                >
                                  <ArrowRight className="w-3.5 h-3.5 mr-2" />
                                  フォルダを開く
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCreateCard(fId);
                                  }}
                                  className="rounded-lg text-xs"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-2" />
                                  カード作成
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCreateFolder(fId);
                                  }}
                                  className="rounded-lg text-xs"
                                >
                                  <FolderPlusIcon className="w-3.5 h-3.5 mr-2" />
                                  サブフォルダ作成
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(folder);
                                  }}
                                  className="rounded-lg text-xs"
                                >
                                  <Pencil className="w-3.5 h-3.5 mr-2" />
                                  名前変更
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onHide(folder);
                                  }}
                                  className="rounded-lg text-xs"
                                >
                                  <MoreVertical className="w-3.5 h-3.5 mr-2" />
                                  非表示にする
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSilent(folder);
                                  }}
                                  className="rounded-lg text-xs"
                                >
                                  {isSilent ? (
                                    <>
                                      <Bell className="w-3.5 h-3.5 mr-2" />
                                      通知ON
                                    </>
                                  ) : (
                                    <>
                                      <BellOff className="w-3.5 h-3.5 mr-2" />
                                      通知OFF
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(folder);
                                  }}
                                  className="text-red-600 rounded-lg text-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  削除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {dropProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}
            </Draggable>
          );
        })}

        {/* カード一覧を表示 */}
        {childCards.length > 0 && (
          <div className="pt-2 pb-1 bg-slate-50/30 border-t border-slate-100 mt-2">
            <div className="px-3 mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Cards</span>
            </div>
            {childCards.map((card) => {
              const cId = card.id || card.cardId;
              return (
                <div
                  key={cId}
                  onClick={() => onCardClick?.(cId)}
                  className="group flex items-center gap-2.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-200 text-slate-700 hover:bg-slate-100"
                >
                  <div className="p-1 rounded-md flex-shrink-0 bg-slate-200 text-slate-500">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-semibold truncate">
                      {card.frontText || card.front_text || '(内容なし)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* インライン作成用入力フィールド */}
        {isCreatingFolder && (
          <div className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-primary-50/30 ring-1 ring-primary-500/20">
            <div className="p-1 rounded-md flex-shrink-0 bg-white shadow-sm text-primary-500">
              <Folder className="w-3.5 h-3.5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSubmit();
                if (e.key === 'Escape') {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }
              }}
              onBlur={handleCreateSubmit}
              placeholder="フォルダ名を入力..."
              className="bg-transparent border-none outline-none text-[12px] font-medium w-full text-slate-700 placeholder:text-slate-300"
            />
          </div>
        )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
