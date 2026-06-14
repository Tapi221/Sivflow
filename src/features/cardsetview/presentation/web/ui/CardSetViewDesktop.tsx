import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
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
  sourceCardIds: string[];
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
  currentDisplayMode: CardDisplayMode;
  effectiveCardWidthPx: number;
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
type CardReorderDragPayload = {
  cardId: string;
  cardIds: string[];
};



const CARD_SET_VIEW_PAGER_PADDING_INLINE = 0;
const CARD_SET_VIEW_PAGER_PADDING_BLOCK = "50vh";
const CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS = 0;
const CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS = 0;
const CARD_REORDER_DRAG_MIME_TYPE = "application/x-sivflow-card-reorder";
const CARD_REORDER_HANDLE_LABEL = "カードを並び替え";
const CARD_REORDER_HANDLE_CLASS_NAME = "absolute -left-11 top-4 z-20 flex h-9 w-7 items-center justify-center rounded-full border border-[rgba(0,0,0,0.06)] bg-[rgba(255,255,255,0.88)] text-[#8b96a3] opacity-0 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-[opacity,background-color,color,transform] duration-150 ease-out cursor-grab active:cursor-grabbing group-hover/card-reorder:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cfd6df] hover:bg-white hover:text-[#3f4853] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";
const CARD_REORDER_HANDLE_ICON_CLASS_NAME = "text-lg leading-none";



const resolveDropPlacement = (event: DragEvent<HTMLElement>): DropPlacement => {
  const rect = event.currentTarget.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;

  return relativeY < rect.height / 2 ? "before" : "after";
};
const getCardIds = (cards: Card[]) => {
  return cards.map((card) => card.id).filter((id): id is string => Boolean(id));
};
const moveCardId = ({ cardIds, draggedCardId, targetCardId, placement }: { cardIds: string[]; draggedCardId: string; targetCardId: string; placement: DropPlacement; }) => {
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
const normalizeSourceCardIds = (sourceCardIds: string[], currentCardIds: string[]) => {
  const currentCardIdSet = new Set(currentCardIds);
  const sourceCardIdSet = new Set(sourceCardIds);
  const liveSourceCardIds = sourceCardIds.filter((cardId) => currentCardIdSet.has(cardId));
  const appendedCardIds = currentCardIds.filter((cardId) => !sourceCardIdSet.has(cardId));

  return [...liveSourceCardIds, ...appendedCardIds];
};
const orderCardsByIds = (cards: Card[], orderedCardIds: string[]) => {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const orderedCardIdSet = new Set(orderedCardIds);
  const orderedCards = orderedCardIds.map((cardId) => cardById.get(cardId)).filter((card): card is Card => Boolean(card));
  const remainingCards = cards.filter((card) => !orderedCardIdSet.has(card.id));

  return [...orderedCards, ...remainingCards];
};
const parseCardReorderDragPayload = (event: DragEvent<HTMLElement>): CardReorderDragPayload | null => {
  const rawPayload = event.dataTransfer.getData(CARD_REORDER_DRAG_MIME_TYPE);
  if (!rawPayload) return null;

  try {
    const payload = JSON.parse(rawPayload) as Partial<CardReorderDragPayload>;
    if (typeof payload.cardId !== "string") return null;
    if (!Array.isArray(payload.cardIds)) return null;

    const cardIds = payload.cardIds.filter((cardId): cardId is string => typeof cardId === "string" && cardId.length > 0);
    return { cardId: payload.cardId, cardIds };
  } catch {
    return null;
  }
};
const hasCardReorderDragType = (event: DragEvent<HTMLElement>) => {
  return Array.from(event.dataTransfer.types).includes(CARD_REORDER_DRAG_MIME_TYPE);
};
const isSameCardOrder = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((cardId, index) => cardId === right[index]);
};
const buildEmptyStateShellStyle = ({ currentDisplayMode, effectiveCardWidthPx }: { currentDisplayMode: CardDisplayMode; effectiveCardWidthPx: number; }): CSSProperties => {
  if (currentDisplayMode === "fluid") {
    return {
      width: "100%",
      maxWidth: "100%",
    };
  }

  return {
    width: `${effectiveCardWidthPx}px`,
    maxWidth: "100%",
  };
};



const CardSetViewEmptyState = ({ cardSetName, currentDisplayMode, effectiveCardWidthPx, onCreateCard }: CardSetViewEmptyStateProps) => {
  const shellStyle = buildEmptyStateShellStyle({ currentDisplayMode, effectiveCardWidthPx });

  const handleCreateCard = () => {
    void onCreateCard();
  };

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
      <div className="flex min-w-0 flex-col items-center" style={{ paddingBlock: CARD_SET_VIEW_PAGER_PADDING_BLOCK, paddingInline: CARD_SET_VIEW_PAGER_PADDING_INLINE }}>
        <div className="card-active-chrome card-active-chrome--active card-pager-item w-full rounded-3xl" style={shellStyle}>
          <div className="flex min-h-44 w-full min-w-0 flex-col items-center justify-center rounded-3xl border border-[#e7e5de] bg-white px-8 py-7 text-center shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
            <div className="mb-2 max-w-full truncate text-sm font-semibold tracking-tight text-[#242424]">{cardSetName ?? "カードセット"}</div>
            <p className="text-xs font-medium leading-6 text-[#7b7b7b]">このカードセットにはまだカードがありません。</p>
            <button type="button" onClick={handleCreateCard} className="mt-5 rounded-full border border-[#d8d6cf] bg-[#f6f5f2] px-4 py-2 text-xs font-semibold text-[#2f343b] transition-colors hover:bg-[#eeeeea] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7c7]">
              カードを追加
            </button>
          </div>
        </div>
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
        <button type="button" draggable aria-label={CARD_REORDER_HANDLE_LABEL} title={CARD_REORDER_HANDLE_LABEL} data-card-no-flip="true" data-card-reorder-handle="true" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => onDragStart(cardId, event)} onDragEnd={onDragEnd} className={CARD_REORDER_HANDLE_CLASS_NAME}>
          <span aria-hidden className={CARD_REORDER_HANDLE_ICON_CLASS_NAME}>⠿</span>
        </button>
      ) : null}

      {isDropTarget ? (
        <div aria-hidden className={`pointer-events-none absolute -left-4 -right-4 z-30 h-0.5 rounded-full bg-current text-[var(--app-sidebar-text-muted,#777)] opacity-35 ${dragState?.placement === "before" ? "-top-2.5" : "-bottom-2.5"}`} />
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
const CardSetViewDesktop = ({ isLoading, isGlobalEditing, flippedCardIds, cardsForPager, safeCurrentIndex, settings = null, currentDisplayMode, currentCardLayoutMode, folderId, layoutTransitionScrollAnchorRevision, scrollToActiveIndexRequestKey, cardSetId, cardSetName, viewZoomScale, fixedCardWidthPx, fluidAvailableWidthPx, onActiveIndexChange, onFlip, onActiveScrollAnchorFaceChange, onCreateCard, onReorderCards, onToggleUncertainty, onToggleBookmark }: CardSetViewDesktopProps) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const currentCardIds = useMemo(() => getCardIds(cardsForPager), [cardsForPager]);
  const effectiveCardWidthPx = currentDisplayMode === "fluid" ? Math.max(1, Math.floor(fluidAvailableWidthPx)) : Math.max(1, fixedCardWidthPx);
  const interactionModeKey = isGlobalEditing ? "edit" : "view";

  const previewCardIds = useMemo(() => {
    if (!dragState) return null;

    const sourceCardIds = normalizeSourceCardIds(dragState.sourceCardIds, currentCardIds);
    return moveCardId({
      cardIds: sourceCardIds,
      draggedCardId: dragState.draggedCardId,
      targetCardId: dragState.targetCardId,
      placement: dragState.placement,
    });
  }, [currentCardIds, dragState]);

  const renderedCardsForPager = useMemo(() => {
    return previewCardIds ? orderCardsByIds(cardsForPager, previewCardIds) : cardsForPager;
  }, [cardsForPager, previewCardIds]);

  const activeCardId = cardsForPager[safeCurrentIndex]?.id ?? null;
  const renderedSafeCurrentIndex = useMemo(() => {
    if (!activeCardId) return safeCurrentIndex;

    const nextIndex = renderedCardsForPager.findIndex((card) => card.id === activeCardId);
    return nextIndex >= 0 ? nextIndex : safeCurrentIndex;
  }, [activeCardId, renderedCardsForPager, safeCurrentIndex]);

  const preserveScrollAnchorKey = useMemo(() => [currentDisplayMode, interactionModeKey, Math.round(viewZoomScale * 1000), effectiveCardWidthPx, Math.round(fluidAvailableWidthPx), layoutTransitionScrollAnchorRevision].join(":"), [currentDisplayMode, effectiveCardWidthPx, fluidAvailableWidthPx, interactionModeKey, layoutTransitionScrollAnchorRevision, viewZoomScale]);

  const getScrollAnchorSelector = useCallback((card: Card, _idx: number, isActive: boolean) => {
    if (!isActive || currentCardLayoutMode !== "flip") return null;

    const cardId = card.id ?? "";
    return flippedCardIds.has(cardId) ? "[data-card-face=\"answer\"]" : "[data-card-face=\"question\"]";
  }, [currentCardLayoutMode, flippedCardIds]);

  const clearDragState = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (isGlobalEditing) return;
    clearDragState();
  }, [clearDragState, isGlobalEditing]);

  useEffect(() => {
    if (!dragState) return;

    const currentCardIdSet = new Set(currentCardIds);
    const hasAllDraggedSourceCards = dragState.sourceCardIds.every((cardId) => currentCardIdSet.has(cardId));
    if (!hasAllDraggedSourceCards) {
      clearDragState();
    }
  }, [clearDragState, currentCardIds, dragState]);

  const handleDragStart = useCallback((cardId: string, event: DragEvent<HTMLButtonElement>) => {
    const sourceCardIds = getCardIds(cardsForPager);
    if (!cardId || !isGlobalEditing || !sourceCardIds.includes(cardId)) {
      event.preventDefault();
      return;
    }

    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(CARD_REORDER_DRAG_MIME_TYPE, JSON.stringify({ cardId, cardIds: sourceCardIds }));
    event.dataTransfer.setData("text/plain", cardId);
    setDragState({
      draggedCardId: cardId,
      targetCardId: cardId,
      placement: "after",
      sourceCardIds,
    });
  }, [cardsForPager, isGlobalEditing]);

  const handleDragOverCard = useCallback((cardId: string, event: DragEvent<HTMLDivElement>) => {
    if (!isGlobalEditing || !cardId || (!dragState && !hasCardReorderDragType(event))) {
      return;
    }

    const payload = dragState ? null : parseCardReorderDragPayload(event);
    const draggedCardId = dragState?.draggedCardId ?? payload?.cardId ?? null;
    const sourceCardIds = dragState?.sourceCardIds ?? payload?.cardIds ?? [];
    if (!draggedCardId || sourceCardIds.length === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";

    const placement = draggedCardId === cardId ? "after" : resolveDropPlacement(event);
    if (dragState?.targetCardId === cardId && dragState.placement === placement) {
      return;
    }

    setDragState({
      draggedCardId,
      targetCardId: cardId,
      placement,
      sourceCardIds,
    });
  }, [dragState, isGlobalEditing]);

  const handleDropCard = useCallback((cardId: string, event: DragEvent<HTMLDivElement>) => {
    if (!isGlobalEditing || !cardId || (!dragState && !hasCardReorderDragType(event))) {
      return;
    }

    const payload = dragState ? null : parseCardReorderDragPayload(event);
    const draggedCardId = dragState?.draggedCardId ?? payload?.cardId ?? null;
    const sourceCardIds = normalizeSourceCardIds(dragState?.sourceCardIds ?? payload?.cardIds ?? [], getCardIds(cardsForPager));
    if (!draggedCardId || sourceCardIds.length === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const placement = dragState?.targetCardId === cardId ? dragState.placement : resolveDropPlacement(event);
    const nextCardIds = moveCardId({
      cardIds: sourceCardIds,
      draggedCardId,
      targetCardId: cardId,
      placement,
    });

    clearDragState();

    if (isSameCardOrder(sourceCardIds, nextCardIds)) {
      return;
    }

    void onReorderCards(nextCardIds);
  }, [cardsForPager, clearDragState, dragState, isGlobalEditing, onReorderCards]);

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
        cardsOverride={isGlobalEditing ? renderedCardsForPager : undefined}
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
  }, [cardSetId, clearDragState, currentCardLayoutMode, currentDisplayMode, dragState, flippedCardIds, folderId, handleDragOverCard, handleDragStart, handleDropCard, isGlobalEditing, onFlip, onToggleBookmark, onToggleUncertainty, renderedCardsForPager, settings, viewZoomScale]);

  if (isLoading) {
    return <div className="h-full min-h-0 w-full" />;
  }

  if (cardsForPager.length === 0) {
    return <CardSetViewEmptyState cardSetName={cardSetName} currentDisplayMode={currentDisplayMode} effectiveCardWidthPx={effectiveCardWidthPx} onCreateCard={onCreateCard} />;
  }

  return (
    <VerticalCardPager
      cards={renderedCardsForPager}
      activeIndex={renderedSafeCurrentIndex}
      onActiveIndexChange={onActiveIndexChange}
      onFlip={onFlip}
      paddingInlinePx={CARD_SET_VIEW_PAGER_PADDING_INLINE}
      paddingBlock={CARD_SET_VIEW_PAGER_PADDING_BLOCK}
      naturalIndexCommitDelayMs={isGlobalEditing ? CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS : CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS}
      disableItemChrome={isGlobalEditing}
      getCardWidthSpec={() => currentDisplayMode === "fluid" ? { mode: "stretch" as const } : { mode: "fixed" as const, widthPx: effectiveCardWidthPx }}
      getKey={(card) => card.id}
      disableVirtualization={Boolean(dragState)}
      freezeActiveIndex={Boolean(dragState)}
      onActiveScrollAnchorFaceChange={onActiveScrollAnchorFaceChange}
      getScrollAnchorSelector={getScrollAnchorSelector}
      preserveScrollAnchorKey={preserveScrollAnchorKey}
      scrollToActiveIndexRequestKey={scrollToActiveIndexRequestKey}
      scrollToActiveIndexBehavior="auto"
      renderCard={renderCard}
    />
  );
};



export { CardSetViewDesktop };
