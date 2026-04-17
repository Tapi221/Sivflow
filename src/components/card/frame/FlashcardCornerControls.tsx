import {
  CARD_ACTION_BG_CLASS,
  CARD_ACTION_COLOR_IDLE_CLASS,
  CARD_ACTION_ICON_CLASS,
} from "@constants/shared/flashcard";
import { cn } from "@/lib/utils";
import type { ReferenceBlockData } from "@/types";
import { Image as ImageIcon, Link, Volume2 } from "@/ui/icons";
import React from "react";
import { CardCornerActions } from "./CardCornerActions";
import type { FlashcardCardLike, FlashcardMediaLike } from "./flashcardDerived";

interface FlashcardCornerControlsProps {
  card: FlashcardCardLike;
  hasUncertainty: boolean;
  isBookmarked: boolean;
  activeImageItems: FlashcardMediaLike[];
  activeAudioUrls: string[];
  activeReferences: ReferenceBlockData[];
  extraHeaderLeft?: React.ReactNode;
  onToggleUncertainty?: (card: FlashcardCardLike) => void;
  onToggleBookmark?: (card: FlashcardCardLike) => void;
  onOpenImagePopup: () => void;
  onOpenAudioPopup: () => void;
  onOpenReferencePopup: () => void;
  headerIconVisualScale?: number;
}

export interface FlashcardCornerControlsResult {
  actionsTopLeft: React.ReactNode[] | undefined;
  actionsTopRight: React.ReactNode[] | undefined;
}

export const useFlashcardCornerControls = ({
  card,
  hasUncertainty,
  isBookmarked,
  activeImageItems,
  activeAudioUrls,
  activeReferences,
  extraHeaderLeft,
  onToggleUncertainty,
  onToggleBookmark,
  onOpenImagePopup,
  onOpenAudioPopup,
  onOpenReferencePopup,
  headerIconVisualScale = 1,
}: FlashcardCornerControlsProps) => {
  return React.useMemo(() => {
    const actionsTopLeft: React.ReactNode[] = [];
    const actionsTopRight: React.ReactNode[] = [];
    const mediaActionNodes: React.ReactNode[] = [];
    const mediaButtonClass = cn(
      "relative inline-flex h-7 w-7 min-h-0 min-w-0 items-center justify-center rounded-full transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      CARD_ACTION_BG_CLASS,
      CARD_ACTION_COLOR_IDLE_CLASS,
    );

    const safeHeaderIconVisualScale =
      typeof headerIconVisualScale === "number" &&
      Number.isFinite(headerIconVisualScale) &&
      headerIconVisualScale > 0
        ? headerIconVisualScale
        : 1;
    const resolvedIconPx = 14 / safeHeaderIconVisualScale;

    const mediaCountLabel = (count: number) =>
      count > 9 ? "9+" : String(count);

    if (extraHeaderLeft) {
      actionsTopLeft.push(
        <div
          key="extra-header-left"
          className="flex"
          onClick={(e) => e.stopPropagation()}
        >
          {extraHeaderLeft}
        </div>,
      );
    }

    if (
      onToggleUncertainty ||
      onToggleBookmark ||
      hasUncertainty ||
      isBookmarked
    ) {
      actionsTopLeft.push(
        <CardCornerActions
          key="corner-actions"
          onHelp={
            onToggleUncertainty
              ? () => onToggleUncertainty(card)
              : hasUncertainty
                ? () => {}
                : undefined
          }
          onStar={
            onToggleBookmark
              ? () => onToggleBookmark(card)
              : isBookmarked
                ? () => {}
                : undefined
          }
          helpActive={hasUncertainty}
          starActive={isBookmarked}
          disabled={!onToggleUncertainty && !onToggleBookmark}
          iconPx={resolvedIconPx}
        />,
      );
    }

    if (activeImageItems.length > 0) {
      mediaActionNodes.push(
        <button
          key="images"
          onClick={(e) => {
            e.stopPropagation();
            onOpenImagePopup();
          }}
          className={mediaButtonClass}
          aria-label={`画像 ${activeImageItems.length} 件`}
        >
          <ImageIcon
            className={CARD_ACTION_ICON_CLASS}
            style={{
              width: `${resolvedIconPx}px`,
              height: `${resolvedIconPx}px`,
            }}
          />
          <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-slate-100 px-1 text-[9px] font-semibold leading-none text-slate-500">
            {mediaCountLabel(activeImageItems.length)}
          </span>
        </button>,
      );
    }

    if (activeAudioUrls.length > 0) {
      mediaActionNodes.push(
        <button
          key="audios"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAudioPopup();
          }}
          className={mediaButtonClass}
          aria-label={`音声 ${activeAudioUrls.length} 件`}
        >
          <Volume2
            className={CARD_ACTION_ICON_CLASS}
            style={{
              width: `${resolvedIconPx}px`,
              height: `${resolvedIconPx}px`,
            }}
          />
          <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-slate-100 px-1 text-[9px] font-semibold leading-none text-slate-500">
            {mediaCountLabel(activeAudioUrls.length)}
          </span>
        </button>,
      );
    }

    if (activeReferences.length > 0) {
      mediaActionNodes.push(
        <button
          key="references"
          onClick={(e) => {
            e.stopPropagation();
            onOpenReferencePopup();
          }}
          className={mediaButtonClass}
          aria-label={`リンク ${activeReferences.length} 件`}
        >
          <Link
            className={CARD_ACTION_ICON_CLASS}
            style={{
              width: `${resolvedIconPx}px`,
              height: `${resolvedIconPx}px`,
            }}
          />
          <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-slate-100 px-1 text-[9px] font-semibold leading-none text-slate-500">
            {mediaCountLabel(activeReferences.length)}
          </span>
        </button>,
      );
    }

    if (mediaActionNodes.length > 0) {
      actionsTopRight.push(
        <div
          key="media-actions"
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {mediaActionNodes}
        </div>,
      );
    }

    return {
      actionsTopLeft: actionsTopLeft.length > 0 ? actionsTopLeft : undefined,
      actionsTopRight: actionsTopRight.length > 0 ? actionsTopRight : undefined,
    };
  }, [
    activeAudioUrls,
    activeImageItems,
    activeReferences,
    card,
    extraHeaderLeft,
    hasUncertainty,
    headerIconVisualScale,
    isBookmarked,
    onOpenAudioPopup,
    onOpenImagePopup,
    onOpenReferencePopup,
    onToggleBookmark,
    onToggleUncertainty,
  ]);
};
