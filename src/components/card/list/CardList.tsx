import { CardShell } from "@/components/card/frame/CardShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { resolveCardTagNames } from "@/hooks/settings/useTags";
import { DEFAULT_TAG_COLOR_CLASS_NAME } from "@/lib/tags/tagColor";
import { cn } from "@/lib/utils";
import { Edit, HelpCircle, Star, Trash2, Volume2 } from "@/ui/icons";
import { normalizeMemoryStability } from "@/utils/reviewUtils";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import React from "react";

function CardItem({
  card,
  onView,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  getTagColor,
  getTagNameById,
  enableDrag,
  index,
}: unknown) {
  const stability = normalizeMemoryStability(
    card.memoryStability ?? card.memory_stability,
    card.currentLevel ?? card.current_level ?? card.level,
  );
  const hasUncertainty = card.hasUncertainty || card.has_uncertainty;
  const hasAudio =
    card.questionAudios?.length > 0 ||
    card.question_audios?.length > 0 ||
    card.answerAudios?.length > 0 ||
    card.answer_audios?.length > 0;

  const tagNameMap = new Map<string, { name: string }>();
  if (typeof getTagNameById === "function" && Array.isArray(card.tagIds)) {
    for (const id of card.tagIds) {
      if (typeof id !== "string") continue;
      const name = getTagNameById(id);
      if (name) tagNameMap.set(id, { name });
    }
  }
  const userTags = resolveCardTagNames(card.tagIds, card.tags, tagNameMap).map(
    (tagName: string) => ({
      label: tagName,
      color: getTagColor
        ? getTagColor(tagName)
        : DEFAULT_TAG_COLOR_CLASS_NAME,
    }),
  );

  const showTitleOutside = Boolean(card.title);
  const headlineText = showTitleOutside
    ? card.questionText || card.question_text || "質問テキストがありません"
    : card.title ||
      card.questionText ||
      card.question_text ||
      "質問テキストがありません";

  const actionItems: React.ReactNode[] = [];
  if (onEdit) {
    actionItems.push(
      <Button
        key="edit"
        variant="ghost"
        size="icon"
        className="bg-white/90 backdrop-blur shadow-sm hover:bg-slate-100 rounded-full h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(card);
        }}
      >
        <Edit className="w-3.5 h-3.5 text-slate-600" />
      </Button>,
    );
  }
  if (onDelete) {
    actionItems.push(
      <Button
        key="delete"
        variant="ghost"
        size="icon"
        className="bg-white/90 backdrop-blur shadow-sm hover:bg-red-50 hover:text-red-500 rounded-full h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(card);
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>,
    );
  }

  const renderCardContent = (
    ref: unknown = null,
    draggableProps: unknown = {},
    dragHandleProps: unknown = {},
    style: unknown = {},
    isDragging: boolean = false,
  ) => (
    <div
      ref={ref}
      style={{ ...style, ...draggableProps.style }}
      {...draggableProps}
      {...dragHandleProps}
      className={cn(
        "w-full min-w-0",
        showTitleOutside && "flex flex-col gap-2",
      )}
      onClick={() => onView(card)}
    >
      {showTitleOutside && (
        <div className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {card.title}
        </div>
      )}
      <CardShell
        className={cn(
          "group w-full min-w-0 text-left transition-all select-none border border-slate-200 shadow-sm hover:shadow-md",
          isSelected && "ring-2 ring-primary-600",
          (card.isDraft || card.is_draft) && "border-dashed border-slate-300",
          isDragging && "z-50 shadow-xl rotate-2",
        )}
        actions={actionItems}
      >
        <div className="flex-1 min-w-0 flex flex-col items-stretch p-5 h-[240px]">
          <div className="flex shrink-0 transition-all justify-between items-start mb-4 w-full">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "transition-all duration-200",
                  isSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelect(card.id)}
                  className="data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600 rounded-full border-2 border-slate-200 w-5 h-5"
                />
              </div>

              <span className="font-bold text-primary-600 text-lg">
                {Math.round(stability)}%
              </span>

              {hasUncertainty && (
                <div className="rounded-full bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center w-14 h-14">
                  <HelpCircle className="w-5 h-5" />
                </div>
              )}
              {card.isBookmarked && (
                <div className="rounded-full text-primary-600 bg-primary-600/10 border border-primary-600/20 flex items-center justify-center w-14 h-14">
                  <Star className="w-5 h-5 fill-current" />
                </div>
              )}

              {userTags.map((t: unknown, i: number) => (
                <span
                  key={i}
                  className={cn(
                    "px-2 py-1 rounded-full font-bold border text-[10px] surface-convex",
                    t.color,
                  )}
                >
                  {t.label}
                </span>
              ))}

              {(card.isDraft || card.is_draft) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                  作成中
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 transition-opacity group-hover:opacity-0">
              {hasAudio && (
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 leading-tight break-anywhere text-lg mb-2 line-clamp-2">
                {headlineText}
              </h3>
            </div>

            {(card.answerText || card.answer_text) && (
              <div className="text-sm text-slate-500 leading-relaxed break-anywhere">
                <div className="opacity-50 mt-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-400 block text-xs mb-1">
                    ANSWER
                  </span>
                  <div>{card.answerText || card.answer_text}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardShell>
    </div>
  );

  if (!enableDrag) {
    return renderCardContent();
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) =>
        renderCardContent(
          provided.innerRef,
          provided.draggableProps,
          provided.dragHandleProps,
          {},
          snapshot.isDragging,
        )
      }
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
  getTagNameById,
  onDragEnd,
  enableDrag = false,
  viewMode = "grid",
}: unknown) {
  void onToggleUncertainty;
  void onToggleBookmark;
  void viewMode;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="card-list" isDropDisabled={!enableDrag}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {cards.map((card: unknown, index: number) => (
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
                getTagNameById={getTagNameById}
                enableDrag={enableDrag}
              />
            ))}
            {provided.placeholder}

            {cards.length > 0 && (
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





