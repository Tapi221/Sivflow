import { useCallback } from "react";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import { Skeleton } from "@/components/ui/skeleton";
import type { Card, UserSettings } from "@/types";
import {
  CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS,
  CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS,
  CARDVIEW_PAGER_PADDING_BLOCK,
  CARDVIEW_PAGER_PADDING_INLINE,
  EDIT_PREVIEW_RANGE,
  VIEW_PREVIEW_RANGE,
} from "@/pages/card-view/constants";
import { DesktopCardSurface } from "@/pages/card-view/components/DesktopCardSurface";
import { layoutRowsToCardHeightPx } from "@/components/card/common/constants";
import { normalizeLayoutRows } from "@/domain/card/extraRows";

interface CardViewDesktopProps {
  isLoading: boolean;
  isGlobalEditing: boolean;
  flippedCardIds: Set<string>;
  cardsForPager: Card[];
  safeCurrentIndex: number;
  settings?: Partial<UserSettings> | null;
  editPaneWidthPx: number;
  activePaneWidthPx: number;
  folderId: string | null;
  cardSetId: string | null;
  saveSignal: number;
  onActiveIndexChange: (idx: number) => void;
  onFlip: () => void;
  onEdit: () => void;
  onToggleUncertainty: (card: Card) => void | Promise<void>;
  onToggleBookmark: (card: Card) => void | Promise<void>;
}

export function CardViewDesktop({
  isLoading,
  isGlobalEditing,
  flippedCardIds,
  cardsForPager,
  safeCurrentIndex,
  settings = null,
  editPaneWidthPx,
  activePaneWidthPx,
  folderId,
  cardSetId,
  saveSignal,
  onActiveIndexChange,
  onFlip,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: CardViewDesktopProps) {
  const editingCardsOverride = isGlobalEditing ? cardsForPager : undefined;
  const renderWindowRadius = isGlobalEditing
    ? EDIT_PREVIEW_RANGE
    : VIEW_PREVIEW_RANGE;

  const estimateCardHeight = useCallback((card: Card) => {
    const rawRows =
      (card as { layoutRows?: number; layout_rows?: number }).layoutRows ??
      (card as { layout_rows?: number }).layout_rows;
    const baseHeight = layoutRowsToCardHeightPx(normalizeLayoutRows(rawRows));
    return Math.max(520, baseHeight + 120);
  }, []);

  const renderCard = useCallback(
    (card: Card, _idx: number, isActive: boolean) => {
      return (
        <DesktopCardSurface
          card={card}
          isActive={isActive}
          isGlobalEditing={isGlobalEditing}
          editPaneWidthPx={editPaneWidthPx}
          settings={settings}
          isFlipped={flippedCardIds.has(card.id ?? "")}
          folderId={folderId}
          cardSetId={cardSetId}
          cardsOverride={editingCardsOverride}
          saveSignal={saveSignal}
          onFlip={onFlip}
          onEdit={onEdit}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
        />
      );
    },
    [
      isGlobalEditing,
      flippedCardIds,
      folderId,
      cardSetId,
      editingCardsOverride,
      saveSignal,
      onFlip,
      onEdit,
      onToggleUncertainty,
      onToggleBookmark,
      settings,
      editPaneWidthPx,
    ],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="space-y-4 w-full max-w-md px-4">
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
      showActiveState={!isGlobalEditing}
      disableItemChrome={isGlobalEditing}
      getCardWidth={() => activePaneWidthPx}
      getKey={(card) => card.id ?? card.docId ?? card.uid}
      renderWindowRadius={renderWindowRadius}
      getEstimatedHeight={(card) => estimateCardHeight(card)}
      recenterSignal={`${isGlobalEditing ? "edit" : "view"}:${activePaneWidthPx}`}
      renderCard={renderCard}
    />
  );
}
