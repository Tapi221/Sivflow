import { type DragEvent, useCallback, useMemo, useState } from "react";
import { CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS, CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS, CARD_SET_VIEW_PAGER_PADDING_BLOCK, CARD_SET_VIEW_PAGER_PADDING_INLINE } from "@constants/shared/flashcard";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { DesktopCardSurface } from "@/features/cardsetview/presentation/web/ui/components/DesktopCardSurface";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import type { Card, UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";

type DropPlacement = "before" | "after";

type DragState = {
  draggedCardId: string;
  targetCardId: string;
  placement: DropPlacement;
};

type CardSetViewDesktopProps = {
  isLoading: boolean;
  isGlobalEditing: boolean;
  flippedCardIds: Set<string>;
  cardsForPager: Card[];
  safeCurrentIndex: number;
  settings?: Partial<UserSettings> | null;
  currentDisplayMode: CardDisplayMode;
  currentCardLayoutMode: CardLayoutMode;
  folderId: string | null;
  layoutTransitionScrollAnchorRevision: number;
  scrollToActiveIndexRequestKey: number;
  cardSetId: string | null;
  cardSetName: string | null;
  viewZoomScale: number;
  fixedCardWidthPx: number;
  fluidAvailableWidthPx: number;
  onActiveIndexChange: (idx: number) => void;
  onFlip: () => void;
  onActiveScrollAnchorFaceChange?: (face: "question" | "answer" | null) => void;
  onCreateCard: () => void | Promise<void>;
  onReorderCards: (orderedCardIds: string[]) => void | Promise<void>;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
};

type CardSetViewEmptyStateProps = {
  cardSetName: string | null;
  onCreateCard: () => void | Promise<void>;
};

type ReorderableCardSurfaceProps = {
  card: Card;
  isActive: boolean;
  isGlobalEditing: boolean;
  settings?: Partial<UserSettings> | null;
  isFlipped: boolean;
  currentDisplayMode: CardDisplayMode;
  currentCardLayoutMode: CardLayoutMode;
  viewZoomScale: number;
  folderId: string | null;
  cardSetId: string | null;
  cardsOverride?: Card[];
  dragState: DragState | null;
  onFlip: () => void;
  onDragStart: (cardId: string, event: DragEvent<HTMLButtonElement>) => void;
  onDragOverCard: (cardId: string, event: DragEvent<HTMLDivElement>) => void;
  onDropCard: (cardId: string, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
};

const DRAG_HANDLE_LABEL = "カードを並び替え";

const resolveDropPlacement = (event: DragEvent<HTMLElement>): DropPlacement => {
  const rect = event.currentTarget.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;

  return relativeY < rect.height / 2 ? "before" : "after";
};

const moveCardId = ({ cardIds, draggedCardId, targetCardId, placement }: { cardIds: string[]; draggedCardId: string; targetCardId: string; placement: DropPlacement }) => {
  if (draggedCardId === targetCardId) {
    return cardIds;
  }

  const withoutDragged = cardIds.filter((cardId) => cardId !== draggedCardId);
  const targetIndex = withoutDragged.indexOf(targetCardId);
  if (targetIndex < 0) {
    return cardIds;
  }

  const insertIndex = placement === "before" ? targetIndex : targetIndex + 1;
  return [...withoutDragged.slice(0, insertIndex), draggedCardId, ...withoutDragged.slice(insertIndex)];
};

const isSameCardOrder = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((cardId, index) => cardId === right[index]);
};

const CardSetViewEmptyState = ({ cardSetName, onCreateCard }: CardSetViewEmptyStateProps) => {
  const handleCreateCard = () => {
    void onCreateCard();
  };

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center px-8 py-10">
      <div className="flex max-w-[420px] flex-col items-center rounded-[28px] border border-[#e7e5de] bg-white px-8 py-7 text-center shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
        <div className="mb-2 max-w-full truncate text-[15px] font-semibold tracking-[-0.02em] text-[#242424]">{cardSetName ?? "カードセット"}</div>
        <p className="text-[13px] font-medium leading-6 text-[#7b7b7b]">このカードセットにはまだカードがありません。</p>
        <button type="button" onClick={handleCreateCard} className="mt-5 rounded-full border border-[#d8d6cf] bg-[#f6f5f2] px-4 py-2 text-[12px] font-semibold text-[#2f343b] transition-colors hover:bg-[#eeeeea] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]">
          カードを追加
        </button>
      </div>
    </div>
  );
};

const ReorderableCardSurface = ({
  card,
  isActive,
  isGlobalEditing,
  settings,
  isFlipped,
  currentDisplayMode,
  currentCardLayoutMode,
  viewZoomScale,
  folderId,
  cardSetId,
  cardsOverride,
  dragState,
  onFlip,
  onDragStart,
  onDragOverCard,
  onDropCard,
  onDragEnd,
  onToggleUncertainty,
  onToggleBookmark,
}: ReorderableCardSurfaceProps) => {
  const cardId = card.id ?? "";
  const isDragged = dragState?.draggedCardId === cardId;
  const isDropTarget = dragState?.targetCardId === cardId && dragState.draggedCardId !== cardId;

  return (
    <div className="group/card-reorder relative w-full" onDragOver={(event) => onDragOverCard(cardId, event)} onDrop={(event) => onDropCard(cardId, event)} onDragEnd={onDragEnd}>
      {isGlobalEditing ? (
        <button type="button" draggable aria-label={DRAG_HANDLE_LABEL} title={DRAG_HANDLE_LABEL} onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onDragStart={(event) => onDragStart(cardId, event)} onDragEnd={onDragEnd} className="absolute left-[-44px] top-4 z-20 flex h-9 w-8 cursor-grab items-center justify-center rounded-xl border border-[#e3e0d8] bg-white/90 text-[#9a958b] opacity-0 shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur transition hover:bg-[#f4f2ed] hover:text-[#4f4b45] active:cursor-grabbing group-hover/card-reorder:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cfc8b7]">
          <span className="leading-none tracking-[-0.2em]">⋮⋮</span>
        </button>
      ) : null}

      {isDropTarget ? (
        <div aria-hidden className={`pointer-events-none absolute left-[-18px] right-[-18px] z-30 h-[3px] rounded-full bg-[#b9ab8f] shadow-[0_0_0_3px_rgba(185,171,143,0.16)] ${dragState?.placement === "before" ? "top-[-10px]" : "bottom-[-10px]"}`} />
      ) : null}

      <div className={isDragged ? "opacity-45" : undefined}>
        <DesktopCardSurface
          card={card}
          isActive={isActive}
          isGlobalEditing={isGlobalEditing}
          settings={settings}
          isFlipped={isFlipped}
          currentDisplayMode={currentDisplayMode}
          currentCardLayoutMode={currentCardLayoutMode}
          viewZoomScale={viewZoomScale}
          folderId={folderId}
          cardSetId={cardSetId}
          cardsOverride={cardsOverride}
          onFlip={onFlip}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
        />
      </div>
    </div>
  );
};

export const CardSetViewDesktop = ({
  isLoading,
  isGlobalEditing,
  flippedCardIds,
  cardsForPager,
  safeCurrentIndex,
  settings = null,
  currentDisplayMode,
  currentCardLayoutMode,
  folderId,
  layoutTransitionScrollAnchorRevision,
  scrollToActiveIndexRequestKey,
  cardSetId,
  cardSetName,
  viewZoomScale,
  fixedCardWidthPx,
  fluidAvailableWidthPx,
  onActiveIndexChange,
  onFlip,
  onActiveScrollAnchorFaceChange,
  onCreateCard,
  onReorderCards,
  onToggleUncertainty,
  onToggleBookmark,
}: CardSetViewDesktopProps) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const effectiveCardWidthPx = currentDisplayMode === "fluid" ? Math.max(1, Math.floor(fluidAvailableWidthPx)) : Math.max(1, fixedCardWidthPx);
  const interactionModeKey = isGlobalEditing ? "edit" : "view";

  const preserveScrollAnchorKey = useMemo(() => [currentDisplayMode, interactionModeKey, Math.round(viewZoomScale * 1000), effectiveCardWidthPx, Math.round(fluidAvailableWidthPx), layoutTransitionScrollAnchorRevision].join(":"), [currentDisplayMode, effectiveCardWidthPx, fluidAvailableWidthPx, interactionModeKey, layoutTransitionScrollAnchorRevision, viewZoomScale]);

  const getScrollAnchorSelector = useCallback((card: Card, _idx: number, isActive: boolean) => {
    if (!isActive || currentCardLayoutMode !== "flip") return null;

    const cardId = card.id ?? "";
    return flippedCardIds.has(cardId) ? "[data-card-face=\"answer\"]" : "[data-card-face=\"question\"]";
  }, [currentCardLayoutMode, flippedCardIds]);

  const clearDragState = useCallback(() => {
    setDragState(null);
  }, []);

  const handleDragStart = useCallback((cardId: string, event: DragEvent<HTMLButtonElement>) => {
    if (!cardId || !isGlobalEditing) {
      event.preventDefault();
      return;
    }

    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", cardId);
    setDragState({
      draggedCardId: cardId,
      targetCardId: cardId,
      placement: "after",
    });
  }, [isGlobalEditing]);

  const handleDragOverCard = useCallback((cardId: string, event: DragEvent<HTMLDivElement>) => {
    if (!dragState || !cardId || dragState.draggedCardId === cardId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";

    const placement = resolveDropPlacement(event);
    if (dragState.targetCardId === cardId && dragState.placement === placement) {
      return;
    }

    setDragState({
      draggedCardId: dragState.draggedCardId,
      targetCardId: cardId,
      placement,
    });
  }, [dragState]);

  const handleDropCard = useCallback((cardId: string, event: DragEvent<HTMLDivElement>) => {
    if (!dragState || !cardId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const currentCardIds = cardsForPager.map((card) => card.id).filter((id): id is string => Boolean(id));
    const nextCardIds = moveCardId({
      cardIds: currentCardIds,
      draggedCardId: dragState.draggedCardId,
      targetCardId: cardId,
      placement: dragState.targetCardId === cardId ? dragState.placement : resolveDropPlacement(event),
    });

    clearDragState();

    if (isSameCardOrder(currentCardIds, nextCardIds)) {
      return;
    }

    void onReorderCards(nextCardIds);
  }, [cardsForPager, clearDragState, dragState, onReorderCards]);

  const renderCard = useCallback((card: Card, _idx: number, isActive: boolean) => {
    return (
      <ReorderableCardSurface
        card={card}
        isActive={isActive}
        isGlobalEditing={isGlobalEditing}
        settings={settings}
        isFlipped={flippedCardIds.has(card.id ?? "")}
        currentDisplayMode={currentDisplayMode}
        currentCardLayoutMode={currentCardLayoutMode}
        viewZoomScale={viewZoomScale}
        folderId={folderId}
        cardSetId={cardSetId}
        cardsOverride={isGlobalEditing ? cardsForPager : undefined}
        dragState={dragState}
        onFlip={onFlip}
        onDragStart={handleDragStart}
        onDragOverCard={handleDragOverCard}
        onDropCard={handleDropCard}
        onDragEnd={clearDragState}
        onToggleUncertainty={onToggleUncertainty}
        onToggleBookmark={onToggleBookmark}
      />
    );
  }, [cardSetId, cardsForPager, clearDragState, currentCardLayoutMode, currentDisplayMode, dragState, flippedCardIds, folderId, handleDragOverCard, handleDragStart, handleDropCard, isGlobalEditing, onFlip, onToggleBookmark, onToggleUncertainty, settings, viewZoomScale]);

  if (isLoading) {
    return <div className="h-full min-h-0 w-full" />;
  }

  if (cardsForPager.length === 0) {
    return <CardSetViewEmptyState cardSetName={cardSetName} onCreateCard={onCreateCard} />;
  }

  return (
    <VerticalCardPager
      cards={cardsForPager}
      activeIndex={safeCurrentIndex}
      onActiveIndexChange={onActiveIndexChange}
      onFlip={onFlip}
      paddingInlinePx={CARD_SET_VIEW_PAGER_PADDING_INLINE}
      paddingBlock={CARD_SET_VIEW_PAGER_PADDING_BLOCK}
      naturalIndexCommitDelayMs={isGlobalEditing ? CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS : CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS}
      disableItemChrome={isGlobalEditing}
      getCardWidthSpec={() => currentDisplayMode === "fluid" ? { mode: "stretch" as const } : { mode: "fixed" as const, widthPx: effectiveCardWidthPx }}
      getKey={(card) => card.id}
      disableVirtualization={false}
      onActiveScrollAnchorFaceChange={onActiveScrollAnchorFaceChange}
      getScrollAnchorSelector={getScrollAnchorSelector}
      preserveScrollAnchorKey={preserveScrollAnchorKey}
      scrollToActiveIndexRequestKey={scrollToActiveIndexRequestKey}
      scrollToActiveIndexBehavior="auto"
      renderCard={renderCard}
    />
  );
};