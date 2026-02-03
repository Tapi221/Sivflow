import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/Components/ui/context-menu';
import {
  HelpCircle,
  Edit,
  Trash2,
  Image,
  Volume2,
  FileText,
  MoreVertical,
  Plus,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStabilityPhase, normalizeMemoryStability } from '@/utils/reviewUtils';

import { useTags } from '@/hooks/useTags';

// CardItem renders a Draggable if enabled, or a simple div otherwise
function CardItem({ card, index, onView, onEdit, onDelete, onToggleUncertainty, onToggleBookmark, isSelected, onSelect, getTagColor, enableDrag }) {
  // ... (calculations same as before)
  const stability = normalizeMemoryStability(
    card.memoryStability ?? card.memory_stability,
    card.currentLevel ?? card.current_level ?? card.level
  );
  const stabilityPhase = getStabilityPhase(stability);
  const isMastered = stabilityPhase.key === 'solid' || card.isCompleted || card.is_completed;
  const hasUncertainty = card.hasUncertainty || card.has_uncertainty;
  const hasAudio = (card.questionAudios?.length > 0 || card.question_audios?.length > 0) || 
                    (card.answerAudios?.length > 0 || card.answer_audios?.length > 0);

  const userTags = (card.tags && Array.isArray(card.tags)) 
     ? card.tags.map(tag => ({
        label: tag,
        color: getTagColor ? getTagColor(tag) : 'bg-slate-100 text-slate-600 border-slate-200'
     }))
     : [];

  const content = (
        <div
          className={cn(
            "group relative flex flex-col bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all h-[240px] select-none",
            isSelected && "ring-2 ring-primary-600",
            (card.isDraft || card.is_draft) && "border-dashed border-slate-300"
          )}
          onClick={() => onView(card)}
        >
          {/* Top Row: Stability % and Icons */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
                 <div 
                    className={cn(
                        "transition-all duration-200",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                 >
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelect(card.id)}
                        className="data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600 rounded-full w-5 h-5 border-2 border-slate-200"
                    />
                </div>

                <span className="text-lg font-bold text-primary-600">
                    {Math.round(stability)}%
                </span>
                
                {hasUncertainty && (
                     <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <HelpCircle className="w-4 h-4 text-amber-600" />
                     </div>
                 )}
                  {card.isBookmarked && (
                      <div className="w-8 h-8 rounded-full bg-primary-600/10 flex items-center justify-center">
                         <Bookmark className="w-4 h-4 text-primary-600 fill-current" />
                      </div>
                  )}

                 {userTags.map((t, i) => (
                    <span key={i} className={cn("px-2 py-1 rounded-full text-[10px] font-bold border", t.color)}>
                        {t.label}
                    </span>
                 ))}

                {(card.isDraft || card.is_draft) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        作成中
                    </span>
                 )}
            </div>
            <div className="flex items-center gap-1 group-hover:opacity-0 transition-opacity">
                 {hasAudio && (
                     <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                        <Volume2 className="w-4 h-4 text-slate-400" />
                     </div>
                 )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 leading-tight">
               {card.title || card.questionText || card.question_text || '無題のカード'}
            </h3>
            <p className="text-sm text-slate-500 line-clamp-4 leading-relaxed">
               {card.questionText || card.question_text || '質問テキストがありません'}
               <br/>
               <span className="opacity-50 mt-1 block">
                {card.answerText || card.answer_text}
               </span>
            </p>
          </div>
          
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm hover:bg-slate-100 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                >
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm hover:bg-red-50 hover:text-red-500 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onDelete(card); }}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
  );

  if (!enableDrag) {
    return content;
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={cn(
             snapshot.isDragging && "z-50 shadow-xl rotate-2" // Apply drag styles to wrapper
          )}
        >
          {content}
        </div>
      )}
    </Draggable>
  );
}

export default function CardList({ 
  cards, 
  onView, 
  onEdit, 
  onDelete,
  onToggleUncertainty,
  onToggleBookmark,
  onBulkClearDraft,
  enableDrag = false, // Default to false to avoid breaking other views
  droppableId = "cards" // Allow customization
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const { getTagColor } = useTags();
  
  const handleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  const handleClearDraftForSelected = () => {
    const selectedCards = cards.filter(c => selectedIds.has(c.id) && (c.isDraft || c.is_draft));
    if (selectedCards.length > 0 && onBulkClearDraft) {
      onBulkClearDraft(selectedCards);
      setSelectedIds(new Set());
    }
  };
  
  const selectedDraftCount = cards.filter(c => selectedIds.has(c.id) && (c.isDraft || c.is_draft)).length;
  
  // Empty State
  if (cards.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {/* 1. Create Action Card */}
        <div 
            role="button"
            tabIndex={0}
            onClick={() => onEdit(null)}
            className="h-[240px] rounded-3xl border-2 border-dashed border-primary-600/30 bg-primary-600/5 flex flex-col items-center justify-center cursor-pointer hover:bg-primary-600/10 hover:border-primary-600/50 hover:shadow-md transition-all group select-none"
        >
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-8 h-8 text-primary-600" />
            </div>
            <span className="font-bold text-primary-600 text-lg">新規カードを作成</span>
            <span className="text-xs text-primary-600/60 mt-2 font-medium">ここから学習セットを作りましょう</span>
        </div>

        {/* 2. Ghost Card 1 (Placeholder) */}
        <div className="hidden md:flex flex-col bg-slate-50/50 rounded-3xl p-6 border border-slate-100/50 h-[240px] select-none pointer-events-none opacity-40 grayscale">
            {/* Fake Header */}
            <div className="flex justify-between items-start mb-4 opacity-50">
                <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                     <span className="text-lg font-bold text-slate-300">0%</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100" />
            </div>
            {/* Fake Content */}
            <div className="flex-1 space-y-3 opacity-50">
                <div className="h-6 w-3/4 bg-slate-200/50 rounded-md" />
                <div className="space-y-2 pt-2">
                    <div className="h-4 w-full bg-slate-200/50 rounded-sm" />
                    <div className="h-4 w-5/6 bg-slate-200/50 rounded-sm" />
                </div>
            </div>
        </div>

        {/* 3. Ghost Card 2 (Placeholder) */}
        <div className="hidden lg:flex flex-col bg-slate-50/30 rounded-3xl p-6 border border-slate-100/50 h-[240px] select-none pointer-events-none opacity-20 grayscale">
             {/* Fake Header */}
             <div className="flex justify-between items-start mb-4 opacity-50">
                <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                     <span className="text-lg font-bold text-slate-300">--</span>
                </div>
            </div>
             {/* Fake Content */}
             <div className="flex-1 space-y-3 opacity-50">
                <div className="h-6 w-1/2 bg-slate-200/50 rounded-md" />
                <div className="space-y-2 pt-2">
                    <div className="h-4 w-full bg-slate-200/50 rounded-sm" />
                    <div className="h-4 w-4/6 bg-slate-200/50 rounded-sm" />
                    <div className="h-4 w-5/6 bg-slate-200/50 rounded-sm" />
                </div>
            </div>
        </div>
      </div>
    );
  }
  
  // Render List
  const renderList = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <CardItem
            key={card.id}
            card={card}
            index={index}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleUncertainty={onToggleUncertainty}
            onToggleBookmark={onToggleBookmark}
            isSelected={selectedIds.has(card.id)}
            onSelect={handleSelect}
            getTagColor={getTagColor}
            enableDrag={enableDrag}
          />
        ))}
      </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
            {enableDrag ? (
                <Droppable droppableId={droppableId} direction="horizontal" isCombineEnabled={false}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {cards.map((card, index) => (
                        <CardItem
                          key={card.id}
                          card={card}
                          index={index}
                          onView={onView}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onToggleUncertainty={onToggleUncertainty}
                          onToggleBookmark={onToggleBookmark}
                          isSelected={selectedIds.has(card.id)}
                          onSelect={handleSelect}
                          getTagColor={getTagColor}
                          enableDrag={true}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
            ) : (
                renderList()
            )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem
          onClick={handleClearDraftForSelected}
          disabled={selectedDraftCount === 0}
        >
          <FileText className="w-4 h-4 mr-2" />
          選択したカードの「作成中」を解除 ({selectedDraftCount}件)
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setSelectedIds(new Set())}>
          <span className="ml-6">選択解除</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}