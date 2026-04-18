import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/contexts/AuthContext";
import { getCardText } from "@/domain/card/content";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import {
  CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS,
  CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS,
  CARD_SET_VIEW_PAGER_PADDING_BLOCK,
  CARD_SET_VIEW_PAGER_PADDING_INLINE,
} from "@constants/shared/flashcard";
import { DesktopCardSurface } from "@/features/cardsetview/presentation/web/ui/components/DesktopCardSurface";
import {
  ACTIVE_INDEX_RENDER_RADIUS,
  VerticalCardPager,
} from "@/features/review/VerticalCardPager";
import { useCardImagePreloader } from "@/hooks/card/useCardImagePreloader";
import type { Card, UserSettings } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CARD_LOADING_PREVIEW_RULED_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 24px)",
  backgroundPosition: "12px 44px",
  backgroundRepeat: "repeat",
  backgroundSize: "calc(100% - 24px) 24px",
};

const CardLoadingPreview = ({ card }: { card: Card }) => {
  return (
    <div
      aria-hidden
      style={{
        height: 900,
        width: "100%",
        borderRadius: "inherit",
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow:
          "0 0 2px rgba(15,23,42,0.04), 0 0 24px rgba(15,23,42,0.08), 0 0 72px rgba(15,23,42,0.08)",
        ...CARD_LOADING_PREVIEW_RULED_STYLE,
      }}
    >
      {getCardText(card, "question") && (
        <div
          style={{
            position: "absolute",
            top: 52,
            left: 20,
            right: 20,
            fontSize: 14,
            lineHeight: "24px",
            opacity: 0.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 6,
            WebkitBoxOrient: "vertical",
            wordBreak: "break-word",
          }}
        >
          {getCardText(card, "question")}
        </div>
      )}
    </div>
  );
};

interface CardSetViewDesktopProps {
  isLoading: boolean;
  isGlobalEditing: boolean;
  flippedCardIds: Set<string>;
  cardsForPager: Card[];
  selectedCardId: string | null;
  safeCurrentIndex: number;
  settings?: Partial<UserSettings> | null;
  currentDisplayMode: CardDisplayMode;
  currentCardLayoutMode: CardLayoutMode;
  folderId: string | null;
  cardSetId: string | null;
  viewZoomScale: number;
  fixedCardWidthPx: number;
  fluidAvailableWidthPx: number;
  onActiveIndexChange: (idx: number) => void;
  onFlip: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
  onSyncStatusChange: (status: CardSyncStatus | null) => void;
}

export const CardSetViewDesktop = ({
  isLoading,
  isGlobalEditing,
  flippedCardIds,
  cardsForPager,
  selectedCardId,
  safeCurrentIndex,
  settings = null,
  currentDisplayMode,
  currentCardLayoutMode,
  folderId,
  cardSetId,
  viewZoomScale,
  fixedCardWidthPx,
  fluidAvailableWidthPx,
  onActiveIndexChange,
  onFlip,
  onToggleUncertainty,
  onToggleBookmark,
  onSyncStatusChange,
}: CardSetViewDesktopProps) => {
  const { currentUser } = useAuthSession();

  const effectiveCardWidthPx =
    currentDisplayMode === "fluid"
      ? Math.max(1, Math.floor(fluidAvailableWidthPx))
      : Math.max(1, fixedCardWidthPx);

  const preserveScrollAnchorKey = useMemo(
    () =>
      [
        currentDisplayMode,
        currentCardLayoutMode,
        isGlobalEditing ? "edit" : "view",
        Math.round(viewZoomScale * 1000),
        effectiveCardWidthPx,
        Math.round(fluidAvailableWidthPx),
      ].join(":"),
    [
      currentCardLayoutMode,
      currentDisplayMode,
      effectiveCardWidthPx,
      fluidAvailableWidthPx,
      isGlobalEditing,
      viewZoomScale,
    ],
  );

  const [renderRange, setRenderRange] = useState<{
    start: number;
    end: number;
  } | null>(() => ({
    start: Math.max(0, safeCurrentIndex - ACTIVE_INDEX_RENDER_RADIUS),
    end: Math.min(
      Math.max(0, cardsForPager.length - 1),
      safeCurrentIndex + ACTIVE_INDEX_RENDER_RADIUS,
    ),
  }));

  const readySet = useCardImagePreloader(
    cardsForPager,
    safeCurrentIndex,
    currentUser?.uid ?? null,
    renderRange,
  );

  const readySetRef = useRef(readySet);

  useEffect(() => {
    readySetRef.current = readySet;
  }, [readySet]);

  const editingCardsOverride = isGlobalEditing ? cardsForPager : undefined;

  const selectedIndex = useMemo(() => {
    if (!selectedCardId) return -1;
    return cardsForPager.findIndex((card) => card.id === selectedCardId);
  }, [cardsForPager, selectedCardId]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    if (selectedIndex === safeCurrentIndex) return;
    onActiveIndexChange(selectedIndex);
  }, [onActiveIndexChange, safeCurrentIndex, selectedIndex]);

  const getScrollAnchorSelector = useCallback(
    (card: Card, _idx: number, isActive: boolean) => {
      if (!isActive || currentCardLayoutMode !== "flip") {
        return null;
      }

      const cardId = card.id ?? "";
      return flippedCardIds.has(cardId)
        ? '[data-card-face="answer"]'
        : '[data-card-face="question"]';
    },
    [currentCardLayoutMode, flippedCardIds],
  );

  const renderCard = useCallback(
    (_card: Card, _idx: number, isActive: boolean) => {
      const card = _card;
      const readyToDisplay =
        isActive || isGlobalEditing || readySetRef.current.has(card.id ?? "");

      if (!readyToDisplay) {
        return <CardLoadingPreview card={card} />;
      }

      return (
        <DesktopCardSurface
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
          cardsOverride={editingCardsOverride}
          onFlip={onFlip}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
          onSyncStatusChange={onSyncStatusChange}
        />
      );
    },
    [
      cardSetId,
      currentCardLayoutMode,
      currentDisplayMode,
      editingCardsOverride,
      flippedCardIds,
      folderId,
      isGlobalEditing,
      onFlip,
      onSyncStatusChange,
      onToggleBookmark,
      onToggleUncertainty,
      settings,
      viewZoomScale,
    ],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-md space-y-4 px-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <VerticalCardPager
      cards={cardsForPager}
      activeIndex={safeCurrentIndex}
      onActiveIndexChange={onActiveIndexChange}
      onFlip={onFlip}
      paddingInlinePx={CARD_SET_VIEW_PAGER_PADDING_INLINE}
      paddingBlock={CARD_SET_VIEW_PAGER_PADDING_BLOCK}
      naturalIndexCommitDelayMs={
        isGlobalEditing
          ? CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS
          : CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS
      }
      disableItemChrome={isGlobalEditing}
      getCardWidthSpec={() =>
        currentDisplayMode === "fluid"
          ? { mode: "stretch" as const }
          : { mode: "fixed" as const, widthPx: effectiveCardWidthPx }
      }
      getKey={(card) => card.id}
      disableVirtualization={false}
      onRenderRangeChange={setRenderRange}
      getScrollAnchorSelector={getScrollAnchorSelector}
      preserveScrollAnchorKey={preserveScrollAnchorKey}
      renderCard={renderCard}
    />
  );
};
