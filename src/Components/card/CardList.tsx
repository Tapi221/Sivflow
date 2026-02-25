import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { CardShell } from './CardShell';
import {
  HelpCircle,
  Edit,
  Trash2,
  Volume2,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStabilityPhase, normalizeMemoryStability } from '@/utils/reviewUtils';

// CardItem renders a Draggable if enabled, or a simple div otherwise
function CardItem({ card, index, onView, onEdit, onDelete, onToggleUncertainty, onToggleBookmark, isSelected, onSelect, getTagColor, enableDrag, viewMode = 'grid' }) {
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

  const wrapperClass = (isDragging) => cn(
    "group w-full min-w-0 text-left transition-all select-none",
    viewMode === 'grid' 
      ? "border border-slate-200 shadow-sm hover:shadow-md"
      : viewMode === 'gallery'
        ? "border border-slate-200 shadow-sm hover:shadow-md"
        : viewMode === 'compact'
          ? "border border-slate-200 shadow-sm hover:shadow-md"
          : viewMode === 'table'
            ? "border-0 border-b border-slate-100 rounded-none shadow-none hover:bg-slate-50 transition-colors"
            : viewMode === 'hero'
              ? "shadow-xl bg-gradient-to-br from-white to-slate-50 border-primary-100"
              : viewMode === 'magazine'
                ? "border-l-4 border-l-primary-600 bg-white"
                : viewMode === 'sticky'
                  ? "bg-amber-50 border-amber-200 shadow-md hover:rotate-0 hover:scale-105 w-48 max-w-none"
                  : viewMode === 'bullet'
                    ? "border-0 shadow-none hover:bg-slate-50 rounded-lg group/bullet"
                    : "border border-slate-200 shadow-sm hover:shadow-md",
    isSelected && "ring-2 ring-primary-600",
    (card.isDraft || card.is_draft) && "border-dashed border-slate-300",
    isDragging && "z-50 shadow-xl rotate-2"
  );

  const contentClass = cn(
    "flex-1 min-w-0",
    viewMode === 'grid' 
      ? "flex flex-col items-stretch p-5 h-[240px]" 
      : viewMode === 'gallery'
        ? "flex flex-col items-stretch p-5 h-auto mb-4 break-inside-avoid"
        : viewMode === 'compact'
          ? "flex flex-row items-center p-2 h-14 gap-3 text-sm"
          : viewMode === 'table'
            ? "flex flex-row items-center p-0 h-12 gap-0 text-sm"
            : viewMode === 'hero'
              ? "flex flex-col items-stretch p-8 h-auto mb-8"
              : viewMode === 'magazine'
                ? "flex flex-col items-stretch p-6 h-auto mb-6"
                : viewMode === 'sticky'
                  ? "flex flex-col items-stretch p-4 h-48 w-48 aspect-square"
                  : viewMode === 'bullet'
                    ? "flex flex-row items-center p-1 h-10 gap-2 text-sm"
                    : "flex flex-row items-center p-3 h-auto gap-4"
  );

  const showTitleOutside = Boolean(card.title) && (
    viewMode === 'grid' ||
    viewMode === 'gallery' ||
    viewMode === 'hero' ||
    viewMode === 'magazine'
  );

  const headlineText = showTitleOutside
    ? (card.questionText || card.question_text || '質問テキストがありません')
    : (card.title || card.questionText || card.question_text || '質問テキストがありません');

  const actionItems: React.ReactNode[] = [];
  if (onEdit) {
    actionItems.push(
      <Button
        key="edit"
        variant="ghost"
        size="icon"
        className="bg-white/90 backdrop-blur shadow-sm hover:bg-slate-100 rounded-full h-8 w-8"
        onClick={(e) => { e.stopPropagation(); onEdit(card); }}
      >
        <Edit className="w-3.5 h-3.5 text-slate-600" />
      </Button>
    );
  }
  if (onDelete) {
    actionItems.push(
      <Button
        key="delete"
        variant="ghost"
        size="icon"
        className="bg-white/90 backdrop-blur shadow-sm hover:bg-red-50 hover:text-red-500 rounded-full h-8 w-8"
        onClick={(e) => { e.stopPropagation(); onDelete(card); }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    );
  }

  const renderCardContent = (ref: any = null, draggableProps: any = {}, dragHandleProps: any = {}, style: any = {}, isDragging: boolean = false) => (
    <div
      ref={ref}
      // eslint-disable-next-line react/forbid-dom-props
      style={{ ...style, ...draggableProps.style }}
      {...draggableProps}
      {...dragHandleProps}
      className={cn("w-full min-w-0", showTitleOutside && "flex flex-col gap-2")}
      onClick={() => onView(card)}
    >
      {showTitleOutside && (
        <div className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {card.title}
        </div>
      )}
      <CardShell
        className={wrapperClass(isDragging)}
        actions={actionItems}
      >
        <div className={contentClass}>
        {/* Top Row / Left Col */}
        <div className={cn(
            "flex shrink-0 transition-all",
            (viewMode === 'grid' || viewMode === 'gallery' || viewMode === 'hero' || viewMode === 'magazine' || viewMode === 'sticky') ? "justify-between items-start mb-4 w-full" : "items-center gap-2 w-auto mr-0 mb-0"
        )}>
        <div className="flex items-center gap-2">
            {viewMode === 'bullet' && (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/bullet:bg-primary-600 outline outline-offset-2 outline-transparent group-hover/bullet:outline-primary-200" />
            )}
             <div 
                className={cn(
                    "transition-all duration-200",
                    (isSelected || viewMode === 'table') ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
             >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(card.id)}
                    className={cn(
                        "data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600 rounded-full border-2 border-slate-200",
                        viewMode === 'table' || viewMode === 'bullet' || viewMode === 'compact' ? "w-4 h-4" : "w-5 h-5"
                    )}
                />
            </div>

            {viewMode === 'table' ? (
                <div className="w-12 text-right font-mono text-slate-400 text-[11px] shrink-0 pr-2 border-r border-slate-100">
                    {index + 1}
                </div>
            ) : viewMode !== 'compact' && viewMode !== 'bullet' && (
                <span className={cn(
                    "font-bold text-primary-600",
                    (viewMode === 'timeline' || viewMode === 'sticky') ? "text-sm" : viewMode === 'hero' ? "text-2xl" : "text-lg"
                )}>
                    {Math.round(stability)}%
                </span>
            )}
            
            {hasUncertainty && (
                 <div className={cn(
                     "rounded-full bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center w-14 h-14"
                 )}>
                    <HelpCircle className="w-5 h-5" />
                 </div>
             )}
              {card.isBookmarked && (
                  <div className={cn(
                      "rounded-full text-primary-600 bg-primary-600/10 border border-primary-600/20 flex items-center justify-center w-14 h-14"
                  )}>
                     <Star className="w-5 h-5 fill-current" />
                  </div>
              )}

             {viewMode !== 'compact' && viewMode !== 'bullet' && viewMode !== 'table' && userTags.map((t, i) => (
                <span key={i} className={cn("px-2 py-1 rounded-full font-bold border", t.color, viewMode === 'hero' ? "text-xs px-3 py-1.5" : "text-[10px]")}>
                    {t.label}
                </span>
             ))}

            {(card.isDraft || card.is_draft) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    作成中
                </span>
             )}
        </div>
        <div className={cn(
            "flex items-center gap-1 transition-opacity",
            (viewMode === 'grid' || viewMode === 'gallery' || viewMode === 'hero') ? "group-hover:opacity-0" : viewMode === 'table' ? "opacity-0" : "opacity-100"
        )}>
             {hasAudio && (
                 <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                 </div>
             )}
        </div>
      </div>

        <div className={cn(
            "flex-1 min-w-0",
            (viewMode === 'list' || viewMode === 'compact' || viewMode === 'timeline' || viewMode === 'table') && "flex items-center gap-4",
            viewMode === 'table' && "grid grid-cols-[1.5fr_2fr_100px_100px] items-center"
        )}>
        <div className="min-w-0">
             <h3 className={cn(
                 "font-bold text-slate-800 leading-tight break-anywhere",
                 (viewMode === 'grid' || viewMode === 'gallery' || viewMode === 'magazine') ? "text-lg mb-2 line-clamp-2" : 
                 viewMode === 'hero' ? "text-3xl mb-4" :
                 (viewMode === 'compact' || viewMode === 'table' || viewMode === 'bullet') ? "text-sm mb-0 truncate" : 
                 "text-base mb-0 truncate"
             )}>
                {headlineText}
             </h3>
             {!showTitleOutside && (viewMode === 'grid' || viewMode === 'gallery' || viewMode === 'magazine' || viewMode === 'hero') && (
                 <div className={cn(
                     "text-slate-500 leading-relaxed break-anywhere",
                     viewMode === 'hero' ? "text-xl mb-6 opacity-70" : "text-sm line-clamp-4",
                     viewMode === 'magazine' && "text-slate-700 italic border-l-2 border-slate-200 pl-4 py-1 mb-4"
                 )}>
                    {card.questionText || card.question_text || '質問テキストがありません'}
                 </div>
             )}
        </div>
        
        <div className={cn(
            "text-sm",
            (viewMode === 'grid' || viewMode === 'gallery' || viewMode === 'magazine') ? "text-slate-500 leading-relaxed break-anywhere" : 
            viewMode === 'hero' ? "text-lg bg-slate-100/50 p-6 rounded-2xl border border-slate-200" :
            viewMode === 'table' ? "text-slate-600 truncate px-4 border-l border-slate-100 h-full flex items-center" :
            "text-slate-600 truncate flex items-center gap-2"
        )}>
           {(viewMode === 'list' || viewMode === 'compact' || viewMode === 'timeline') && (
               <>
                   {viewMode !== 'compact' && <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0">Answer</span>}
                   <span className="truncate">{card.answerText || card.answer_text || <span className="italic text-slate-300">No answer</span>}</span>
               </>
           )}

           {viewMode === 'table' && (
               <span className="truncate">{card.answerText || card.answer_text || '-'}</span>
           )}
           
           {(viewMode === 'hero' || ((viewMode === 'grid' || viewMode === 'gallery' || viewMode === 'magazine') && (card.answerText || card.answer_text))) && (
               <div className={cn(
                   "opacity-50",
                   viewMode === 'hero' ? "opacity-100" : "mt-2 pt-2 border-t border-slate-100"
               )}>
                <span className={cn("font-bold text-slate-400 block", viewMode === 'hero' ? "text-sm mb-2 text-primary-600" : "text-xs mb-1")}>ANSWER</span>
                <div className={viewMode === 'hero' ? "text-slate-800 leading-relaxed" : ""}>
                    {card.answerText || card.answer_text}
                </div>
               </div>
           )}
        </div>

        {viewMode === 'table' && (
            <>
                <div className="text-[11px] font-bold text-primary-600 flex items-center justify-center px-4 border-l border-slate-100 h-full">
                    {Math.round(stability)}%
                </div>
                <div className="flex gap-1 overflow-hidden px-4 border-l border-slate-100 h-full items-center">
                    {userTags.slice(0, 1).map((t, i) => (
                        <span key={i} className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border truncate max-w-full", t.color)}>
                            {t.label}
                        </span>
                    ))}
                    {userTags.length > 1 && <span className="text-[9px] text-slate-400">+{userTags.length - 1}</span>}
                </div>
            </>
        )}
      </div>
      </div>
    </CardShell>
    </div>
  );

  if (viewMode === 'timeline') {
      return (
        <div className="flex gap-4 relative group/timeline">
             {/* Timeline track */}
            <div className="flex flex-col items-center shrink-0 w-8 md:w-16 pt-0 md:pt-4 relative">
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-100 left-1/2 -translate-x-1/2 group-last/timeline:bottom-auto group-last/timeline:h-full" />
                <div className={cn(
                    "w-3 h-3 md:w-4 md:h-4 rounded-full border-2 z-10 bg-white transition-colors",
                    isMastered ? "border-primary-600 bg-primary-50" : "border-slate-300"
                )} />
                <span className="mt-2 text-[10px] text-slate-400 font-mono hidden md:block">
                    {index + 1}
                </span>
            </div>
            <div className="flex-1 pb-8 min-w-0">
                {enableDrag ? (
                    <Draggable draggableId={card.id} index={index}>
                    {(provided, snapshot) => renderCardContent(
                        provided.innerRef,
                        provided.draggableProps,
                        provided.dragHandleProps,
                        {}, 
                        snapshot.isDragging
                    )}
                    </Draggable>
                ) : (
                    renderCardContent()
                )}
            </div>
        </div>
      );
  }

  if (!enableDrag) {
    return renderCardContent();
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => renderCardContent(
        provided.innerRef,
        provided.draggableProps,
        provided.dragHandleProps,
        {},
        snapshot.isDragging
      )}
    </Draggable>
  );
}

export default function CardList({ 
  cards = [], 
  onEdit, 
  onDelete, 
  onView, 
  onToggleUncertainty, 
  onToggleBookmark, 
  selectedIds = [], 
  onSelect, 
  getTagColor,
  onDragEnd,
  enableDrag = false, 
  viewMode = 'grid' 
}) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="card-list" isDropDisabled={!enableDrag || viewMode === 'gallery'}>
        {(provided) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef}
            className={cn(
                viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : 
                viewMode === 'gallery' ? "columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4" : 
                viewMode === 'timeline' ? "flex flex-col" :
                viewMode === 'table' ? "flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm" :
                viewMode === 'hero' ? "flex flex-col max-w-4xl mx-auto" :
                viewMode === 'sticky' ? "flex flex-wrap gap-8 justify-center p-6" :
                viewMode === 'bullet' ? "flex flex-col gap-1 p-2 bg-white rounded-xl border border-slate-100" :
                "grid grid-cols-1 w-full gap-4"
            )}
          >
            {viewMode === 'table' && (
                <div className="grid grid-cols-[auto_1.5fr_2fr_100px_100px_100px] items-center h-10 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="w-[72px] shrink-0" /> {/* checkbox + index area */}
                    <div className="px-4">Title / Question</div>
                    <div className="px-4 border-l border-slate-200/50">Answer</div>
                    <div className="px-4 border-l border-slate-200/50 text-center">Stability</div>
                    <div className="px-4 border-l border-slate-200/50">Tags</div>
                    <div className="px-4 border-l border-slate-200/50 text-center">Actions</div>
                </div>
            )}
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
                isSelected={selectedIds.includes(card.id)}
                onSelect={onSelect}
                getTagColor={getTagColor}
                enableDrag={enableDrag && viewMode !== 'gallery'}
                viewMode={viewMode}
              />
            ))}
            {provided.placeholder}
            
            {/* Ghost Cards for Grid View - improved contrast */}
            {viewMode === 'grid' && cards.length > 0 && (
                <>
                    <div className="hidden md:flex flex-col bg-slate-50/50 rounded-3xl p-5 border border-slate-200 h-[240px] select-none pointer-events-none opacity-40 grayscale">
                        <div className="flex justify-between items-start mb-4 opacity-50">
                            <div className="flex gap-2">
                                <div className="w-12 h-4 bg-slate-200 rounded-full" />
                                <div className="w-8 h-8 rounded-full bg-slate-100" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-100" />
                        </div>
                        <div className="h-6 w-3/4 bg-slate-200 rounded-lg mb-3 opacity-50" />
                        <div className="h-4 w-full bg-slate-100 rounded-lg mb-2 opacity-50" />
                        <div className="h-4 w-2/3 bg-slate-100 rounded-lg opacity-50" />
                    </div>
                    
                    <div className="hidden lg:flex flex-col bg-slate-50/30 rounded-3xl p-6 border border-slate-200 h-[240px] select-none pointer-events-none opacity-20 grayscale">
                        <div className="flex justify-between items-start mb-4 opacity-50">
                            <div className="flex gap-2">
                                <div className="w-12 h-4 bg-slate-200 rounded-full" />
                                <div className="w-8 h-8 rounded-full bg-slate-100" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-100" />
                        </div>
                        <div className="h-6 w-3/4 bg-slate-200 rounded-lg mb-3 opacity-50" />
                        <div className="h-4 w-full bg-slate-100 rounded-lg mb-2 opacity-50" />
                        <div className="h-4 w-2/3 bg-slate-100 rounded-lg opacity-50" />
                    </div>
                </>
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
