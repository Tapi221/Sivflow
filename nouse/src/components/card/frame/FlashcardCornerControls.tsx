import React from "react";
import { Image as ImageIcon, Link, Volume2 } from "@web-renderer/chip/icons";
import { cn } from "@web-renderer/lib/utils";
import { CARD_ACTION_BG_CLASS, CARD_ACTION_COLOR_IDLE_CLASS, CARD_ACTION_ICON_CLASS } from "./cardAction.constants";
import { CardCornerActions } from "./CardCornerActions";
import type { FlashcardCardLike, FlashcardMediaLike } from "./flashcard.types";
import type { ReferenceBlockData } from "@/types";



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
interface FlashcardCornerControlsResult {
  actionsTopLeft: React.ReactNode[] | undefined;
  actionsTopRight: React.ReactNode[] | undefined;
}



const resolveSafeVisualScale = (value?: number) => {
  if (typeof value !== "number") return 1;
  if (!Number.isFinite(value)) return 1;
  if (value <= 0) return 1;
  return value;
};
const resolveUncertaintyHandler = (card: FlashcardCardLike, hasUncertainty: boolean, onToggleUncertainty?: (card: FlashcardCardLike) => void) => {
  if (onToggleUncertainty) return () => onToggleUncertainty(card);
  if (hasUncertainty) return () => {};
  return undefined;
};
const resolveBookmarkHandler = (card: FlashcardCardLike, isBookmarked: boolean, onToggleBookmark?: (card: FlashcardCardLike) => void) => {
  if (onToggleBookmark) return () => onToggleBookmark(card);
  if (isBookmarked) return () => {};
  return undefined;
};
const useFlashcardCornerControls = ({ card, hasUncertainty, isBookmarked, activeImageItems, activeAudioUrls, activeReferences, extraHeaderLeft, onToggleUncertainty, onToggleBookmark, onOpenImagePopup, onOpenAudioPopup, onOpenReferencePopup, headerIconVisualScale = 1 }: FlashcardCornerControlsProps) => {
  return React.useMemo(() => {
    const actionsTopLeft: React.ReactNode[] = [];
    const actionsTopRight: React.ReactNode[] = [];
    const mediaActionNodes: React.ReactNode[] = [];

    const mediaButtonClass = cn(
      "relative inline-flex min-h-0 min-w-0 items-center justify-center rounded-full transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      CARD_ACTION_BG_CLASS,
      CARD_ACTION_COLOR_IDLE_CLASS,
    );

    const safeHeaderIconVisualScale = resolveSafeVisualScale(
      headerIconVisualScale,
    );
    const resolvedButtonPx = 28 / safeHeaderIconVisualScale;
    const resolvedIconPx = 14 / safeHeaderIconVisualScale;
    const resolvedBadgePx = 16 / safeHeaderIconVisualScale;
    const resolvedBadgeFontPx = 9 / safeHeaderIconVisualScale;

    const mediaButtonStyle: React.CSSProperties = {
      width: `${resolvedButtonPx}px`,
      height: `${resolvedButtonPx}px`,
      minWidth: `${resolvedButtonPx}px`,
      minHeight: `${resolvedButtonPx}px`,
    };

    const mediaIconStyle: React.CSSProperties = {
      width: `${resolvedIconPx}px`,
      height: `${resolvedIconPx}px`,
    };

    const badgeStyle: React.CSSProperties = {
      height: `${resolvedBadgePx}px`,
      minWidth: `${resolvedBadgePx}px`,
      fontSize: `${resolvedBadgeFontPx}px`,
    };

    const mediaCountLabel = (count: number) =>
      count > 9 ? "9+" : String(count);

    if (extraHeaderLeft) {
      actionsTopLeft.push(
        <div
          key="extra-header-left"
          className="flex"
          onClick={(event) => event.stopPropagation()}
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
          onHelp={resolveUncertaintyHandler(card, hasUncertainty, onToggleUncertainty)}
          onStar={resolveBookmarkHandler(card, isBookmarked, onToggleBookmark)}
          helpActive={hasUncertainty}
          starActive={isBookmarked}
          disabled={!onToggleUncertainty && !onToggleBookmark}
          visualScale={safeHeaderIconVisualScale}
        />,
      );
    }

    if (activeImageItems.length > 0) {
      mediaActionNodes.push(
        <button
          key="images"
          onClick={(event) => {
            event.stopPropagation();
            onOpenImagePopup();
          }}
          className={mediaButtonClass}
          style={mediaButtonStyle}
          aria-label={`画像 ${activeImageItems.length} 件`}
        >
          <ImageIcon
            className={CARD_ACTION_ICON_CLASS}
            style={mediaIconStyle}
          />
          <span
            className="pointer-events-none absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full border border-white bg-slate-100 px-1 font-semibold leading-none text-slate-500"
            style={badgeStyle}
          >
            {mediaCountLabel(activeImageItems.length)}
          </span>
        </button>,
      );
    }

    if (activeAudioUrls.length > 0) {
      mediaActionNodes.push(
        <button
          key="audios"
          onClick={(event) => {
            event.stopPropagation();
            onOpenAudioPopup();
          }}
          className={mediaButtonClass}
          style={mediaButtonStyle}
          aria-label={`音声 ${activeAudioUrls.length} 件`}
        >
          <Volume2 className={CARD_ACTION_ICON_CLASS} style={mediaIconStyle} />
          <span
            className="pointer-events-none absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full border border-white bg-slate-100 px-1 font-semibold leading-none text-slate-500"
            style={badgeStyle}
          >
            {mediaCountLabel(activeAudioUrls.length)}
          </span>
        </button>,
      );
    }

    if (activeReferences.length > 0) {
      mediaActionNodes.push(
        <button
          key="references"
          onClick={(event) => {
            event.stopPropagation();
            onOpenReferencePopup();
          }}
          className={mediaButtonClass}
          style={mediaButtonStyle}
          aria-label={`リンク ${activeReferences.length} 件`}
        >
          <Link className={CARD_ACTION_ICON_CLASS} style={mediaIconStyle} />
          <span
            className="pointer-events-none absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full border border-white bg-slate-100 px-1 font-semibold leading-none text-slate-500"
            style={badgeStyle}
          >
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
          onClick={(event) => event.stopPropagation()}
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



export { useFlashcardCornerControls };


export type { FlashcardCornerControlsResult };
