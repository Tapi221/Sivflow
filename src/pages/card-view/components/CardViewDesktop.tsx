import { useCallback, useState } from "react";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";
import { Skeleton } from "@/components/ui/skeleton";
import type { Card } from "@/types";
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
  globalToolbarMountQ: HTMLDivElement | null;
  globalToolbarMountA: HTMLDivElement | null;
}

export function CardViewDesktop({
  isLoading,
  isGlobalEditing,
  isFlipped,
  flippedCardIds,
  cardsForPager,
  safeCurrentIndex,
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
  globalToolbarMountQ,
  globalToolbarMountA,
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
          isFlipped={isFlipped}
          folderId={folderId}
          cardSetId={cardSetId}
          cardsOverride={cardsForPager}
          saveSignal={saveSignal}
          globalToolbarMountQ={globalToolbarMountQ}
          globalToolbarMountA={globalToolbarMountA}
          onFlip={onFlip}
          onEdit={onEdit}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
        />
      );
    },
    [
      isGlobalEditing,
      isFlipped,
      folderId,
      cardSetId,
      cardsForPager,
      saveSignal,
      globalToolbarMountQ,
      globalToolbarMountA,
      onFlip,
      onEdit,
      onToggleUncertainty,
      onToggleBookmark,
      safeCurrentIndex,
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
      freezeActiveIndex={isGlobalEditing}
      getCardWidth={() => activePaneWidthPx}
      getKey={(card) => card.id ?? card.docId ?? card.uid}
      renderCard={renderCard}
    />
  );
}

// Toolbar row rendered above the pager in edit mode
interface DesktopToolbarRowProps {
  isGlobalEditing: boolean;
  editPaneWidthPx: number;
  setGlobalToolbarMountQ: (el: HTMLDivElement | null) => void;
  setGlobalToolbarMountA: (el: HTMLDivElement | null) => void;
}

export function DesktopToolbarRow({
  isGlobalEditing,
  editPaneWidthPx,
  setGlobalToolbarMountQ,
  setGlobalToolbarMountA,
}: DesktopToolbarRowProps) {
  const borderClass = isGlobalEditing
    ? "border border-slate-100 bg-white/60"
    : "border border-transparent bg-transparent";

  return (
    <div className="shrink-0 border-b border-gray-200/70 bg-[#F8FAFB] px-3 py-2">
      <div
        className="mx-auto grid w-full grid-cols-1 gap-4 md:grid-cols-2"
        style={{ width: `${editPaneWidthPx}px`, maxWidth: "100%" }}
      >
        <div className={`flex h-14 min-h-0 w-full items-center rounded-md ${borderClass}`}>
          <div ref={setGlobalToolbarMountQ} className="w-full" />
        </div>
        <div className={`flex h-14 min-h-0 w-full items-center rounded-md ${borderClass}`}>
          <div ref={setGlobalToolbarMountA} className="w-full" />
        </div>
      </div>
    </div>
  );
}
