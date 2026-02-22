import React from 'react';
import { BookOpen, MoreVertical } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { ContextMenu } from '../../ContextMenu';
import { lockToVerticalTransform } from '../dnd/lockToVertical';
import { DnDHelpers } from '@/hooks/useFolderDnD';
import type { Card, SelectedExplorerItem } from '@/types';

interface CardRowProps {
  card: Card;
  depth: number;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editingName: string;
  setEditingName: (name: string) => void;
  editingNameRef: React.MutableRefObject<string>;
  editInputRef: React.RefObject<HTMLInputElement>;
  onItemSelect: (item: SelectedExplorerItem) => void;
  handleMoveCard: (id: string) => void;
  handleDelete: (id: string, type: 'card') => Promise<void>;
  handleRenameConfirm: () => Promise<void>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  isPinned: boolean;
  handleTogglePin: () => void;
  rowBaseClassName: string;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  isDragging: boolean;
  hasUpdateOrDelete: boolean;
  isNewlyCreated?: boolean;
}

export const CardRow: React.FC<CardRowProps> = ({
  card,
  depth,
  index,
  isSelected,
  isEditing,
  setEditingId,
  editingName,
  setEditingName,
  editingNameRef,
  editInputRef,
  onItemSelect,
  handleMoveCard,
  handleDelete,
  handleRenameConfirm,
  renameCancelledRef,
  isPinned,
  handleTogglePin,
  rowBaseClassName,
  setRowRef,
  isDragging,
  hasUpdateOrDelete,
  isNewlyCreated,
}) => {
  const cardId = card.id;
  
  // タイトルがない場合は questionText の最初の部分を表示
  const getCardTitle = () => {
    if (card.title) return card.title;
    if (isNewlyCreated) return '新規カード';
    
    // questionText から最初の50文字を取得（HTMLタグを除去）
    const questionText = (card as any).questionText || (card as any).question_text || '';
    const textOnly = questionText.replace(/<[^>]*>/g, '').trim();
    if (textOnly.length > 0) {
      return textOnly.length > 50 ? textOnly.substring(0, 50) + '...' : textOnly;
    }
    
    return '無題のカード';
  };
  
  const cardTitle = getCardTitle();
  const isOptimisticCard = Boolean((card as any).__optimistic);
  const isDragDisabled = isOptimisticCard || isEditing;
  const hasContextMenu = !isOptimisticCard && hasUpdateOrDelete;
  return (
    <Draggable
      key={cardId}
      draggableId={DnDHelpers.createCardDraggableId(cardId)}
      index={index}
      isDragDisabled={isDragDisabled}
    >
      {(provided, snapshot) => {
        const lockedStyle = lockToVerticalTransform(provided.draggableProps.style);
        return (
          <div 
            ref={(node) => {
              provided.innerRef(node);
              setRowRef(cardId, node);
            }}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              rowBaseClassName,
              !isDragging && "hover:bg-slate-100",
              isSelected && "bg-primary-100/80",
              "pr-9",
              snapshot.isDragging && "bg-white shadow-lg opacity-90 z-50 ring-1 ring-primary-200",
              snapshot.isDragging && "pointer-events-none"
            )}
            style={{
              ...lockedStyle,
              paddingLeft: `${depth * 12 + 4}px`,
              height: 32,
              minHeight: 32,
              boxSizing: 'border-box',
              pointerEvents: snapshot.isDragging ? "none" : "auto", 
            }}
            onClick={() => {
              if (snapshot.isDragging) return;
              if (!isEditing) onItemSelect({ type: 'card', id: cardId });
            }}
          >
            <div
              className={cn(
                "flex-1 flex min-w-0 cursor-pointer",
                "items-center h-full"
              )}
            >
              <BookOpen
                className={cn(
                  "w-4 h-4 flex-shrink-0 mr-1",
                  isPinned ? "text-amber-500" : "text-slate-400"
                )}
              />

              {isEditing ? (
                <input
                  ref={editInputRef}
                  aria-label="カード名の編集"
                  className="text-sm bg-white border border-primary-300 rounded px-1 outline-none ring-1 ring-primary-100 h-6 w-full leading-5"
                  value={editingName}
                  onChange={(e) => {
                    setEditingName(e.target.value);
                    editingNameRef.current = e.target.value;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      renameCancelledRef.current = true;
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={() => void handleRenameConfirm()}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className={cn(
                    "flex gap-1 flex-1 overflow-hidden pr-1",
                    "items-center"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm leading-5 lining-nums tabular-nums",
                      "truncate",
                      isSelected ? "text-primary-700 font-medium" : "text-slate-600"
                    )}
                  >
                    {cardTitle}
                  </span>
                </div>
              )}
            </div>

            {hasContextMenu && !isEditing && (
              <div className="absolute right-1 top-0 h-full flex items-center pointer-events-none">
                <ContextMenu
                  type="card"
                  onRename={() => {
                    setEditingId(cardId);
                    setEditingName(cardTitle);
                  }}
                  onMove={() => handleMoveCard(cardId)}
                  onDelete={() => handleDelete(cardId, 'card')}
                  isPinned={isPinned}
                  onTogglePin={handleTogglePin}
                >
                  <button
                    type="button"
                    aria-label="カードメニューを開く"
                    className="h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 outline-none pointer-events-auto transition-colors shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </ContextMenu>
              </div>
            )}
          </div>
        );
      }}
    </Draggable>
  );
};
