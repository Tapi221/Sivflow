import { useCallback } from "react";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import { Skeleton } from "@/components/ui/skeleton";
import type { Card, UserSettings } from "@/types";
import {
  CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS,
  CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS,
  CARDVIEW_PAGER_PADDING_BLOCK,
  CARDVIEW_PAGER_PADDING_INLINE,
} from "../constants";
import {
  DesktopCardSurface,
  EDIT_PREVIEW_RANGE,
} from "./DesktopCardSurface";

interface CardViewDesktopProps {
  isLoading: boolean;
  isGlobalEditing: boolean;
  isFlipped: boolean;
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
  isFlipped,
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
  const renderCard = useCallback(
    (card: Card, idx: number, isActive: boolean) => {
      const showEditPreview =
        Math.abs(idx - safeCurrentIndex) <= EDIT_PREVIEW_RANGE;
      return (
        <DesktopCardSurface
          card={card}
          isActive={isActive}
          isGlobalEditing={isGlobalEditing}
          showEditPreview={showEditPreview}
          editPaneWidthPx={editPaneWidthPx}
          settings={settings}
          isFlipped={flippedCardIds.has(card.id ?? "")}
          folderId={folderId}
          cardSetId={cardSetId}
          cardsOverride={cardsForPager}
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
      cardsForPager,
      saveSignal,
      onFlip,
      onEdit,
      onToggleUncertainty,
      onToggleBookmark,
      safeCurrentIndex,
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
      renderCard={renderCard}
    />
  );
}
