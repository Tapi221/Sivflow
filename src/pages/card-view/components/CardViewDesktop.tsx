import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/contexts/AuthContext";
import { getCardText } from "@/domain/card/content";
import {
  ACTIVE_INDEX_RENDER_RADIUS,
  VerticalCardPager,
} from "@/features/review/VerticalCardPager";
import { useCardImagePreloader } from "@/hooks/card/useCardImagePreloader";
import { DesktopCardSurface } from "@/pages/card-view/components/DesktopCardSurface";
import {
  CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS,
  CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS,
  CARDVIEW_PAGER_PADDING_BLOCK,
  CARDVIEW_PAGER_PADDING_INLINE,
} from "@/pages/card-view/constants";
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

interface CardViewDesktopProps {
  isLoading: boolean;
  isGlobalEditing: boolean;
  flippedCardIds: Set<string>;
  cardsForPager: Card[];
  selectedCardId: string | null;
  safeCurrentIndex: number;
  settings?: Partial<UserSettings> | null;
  editPaneWidthPx: number;
  currentDisplayMode: CardDisplayMode;
  folderId: string | null;
  cardSetId: string | null;
  viewZoomScale: number;
  fixedCardWidthPx: number;
  fluidAvailableWidthPx: number;
  onActiveIndexChange: (idx: number) => void;
  onFlip: () => void;
  onEdit: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
  onSyncStatusChange: (status: CardSyncStatus | null) => void;
}

export const CardViewDesktop = ({
  isLoading,
  isGlobalEditing,
  flippedCardIds,
  cardsForPager,
  selectedCardId,
  safeCurrentIndex,
  settings = null,
  editPaneWidthPx,
  currentDisplayMode,
  folderId,
  cardSetId,
  viewZoomScale,
  fixedCardWidthPx,
  fluidAvailableWidthPx,
  onActiveIndexChange,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
  onSyncStatusChange,
}: CardViewDesktopProps) => {
  const { currentUser } = useAuthSession();

  const effectiveEditPaneWidthPx = editPaneWidthPx;
  const effectiveCardWidthPx =
    currentDisplayMode === "fluid"
      ? Math.max(1, Math.floor(fluidAvailableWidthPx))
      : Math.max(1, fixedCardWidthPx);

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
          editPaneWidthPx={effectiveEditPaneWidthPx}
          settings={settings}
          isFlipped={flippedCardIds.has(card.id ?? "")}
          currentDisplayMode={currentDisplayMode}
          viewZoomScale={viewZoomScale}
          folderId={folderId}
          cardSetId={cardSetId}
          cardsOverride={editingCardsOverride}
          onFlip={onFlip}
          onEdit={onEdit}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
          onSyncStatusChange={onSyncStatusChange}
        />
      );
    },
    [
      cardSetId,
      currentDisplayMode,
      editingCardsOverride,
      effectiveEditPaneWidthPx,
      flippedCardIds,
      folderId,
      isGlobalEditing,
      onEdit,
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
      paddingInlinePx={CARDVIEW_PAGER_PADDING_INLINE}
      paddingBlock={CARDVIEW_PAGER_PADDING_BLOCK}
      naturalIndexCommitDelayMs={
        isGlobalEditing
          ? CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS
          : CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS
      }
      disableItemChrome={isGlobalEditing}
      getCardWidth={() => effectiveCardWidthPx}
      getKey={(card) => card.id ?? card.docId ?? card.uid}
      disableVirtualization={false}
      onRenderRangeChange={setRenderRange}
      renderCard={renderCard}
    />
  );
};