/**
 * Flashcard のコーナーアクション（uncertainty/bookmark/edit/media/extraHeader）を組み立てるコンポーネント。
 *
 * - actionsTopLeft / actionsTopRight / mediaActionNodes の組み立てロジックを Flashcard.tsx から分離
 * - CardFrame の actionsTopLeft / actionsTopRight props へ渡す ReactNode 配列を返す
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Image as ImageIcon, Volume2, Link } from "@/ui/icons";
import { cn } from "@/lib/utils";
import { CardCornerActions } from "./CardCornerActions";
import {
  CARD_ACTION_BG_CLASS,
  CARD_ACTION_COLOR_IDLE_CLASS,
  CARD_ACTION_ICON_CLASS,
} from "../common/constants";
import type { FlashcardCardLike } from "./flashcardDerived";
import type { ReferenceBlockData } from "@/types";

interface FlashcardCornerControlsProps {
  card: FlashcardCardLike;
  previewMode: boolean | undefined;
  hasUncertainty: boolean;
  isBookmarked: boolean;
  activeImages: string[];
  activeAudioUrls: string[];
  activeReferences: ReferenceBlockData[];
  extraHeaderLeft?: React.ReactNode;
  onEdit?: (card: FlashcardCardLike) => void;
  onToggleUncertainty?: (card: FlashcardCardLike) => void;
  onToggleBookmark?: (card: FlashcardCardLike) => void;
  onOpenImagePopup: () => void;
  onOpenAudioPopup: () => void;
  onOpenReferencePopup: () => void;
}

export interface FlashcardCornerControlsResult {
  actionsTopLeft: React.ReactNode[] | undefined;
  actionsTopRight: React.ReactNode[] | undefined;
}

export function useFlashcardCornerControls({
  card,
  previewMode,
  hasUncertainty,
  isBookmarked,
  activeImages,
  activeAudioUrls,
  activeReferences,
  extraHeaderLeft,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
  onOpenImagePopup,
  onOpenAudioPopup,
  onOpenReferencePopup,
}: FlashcardCornerControlsProps): FlashcardCornerControlsResult {
  const actionsTopLeft: React.ReactNode[] = [];
  const actionsTopRight: React.ReactNode[] = [];
  const mediaActionNodes: React.ReactNode[] = [];

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

  if (onToggleUncertainty || onToggleBookmark) {
    actionsTopLeft.push(
      <CardCornerActions
        key="corner-actions"
        onHelp={onToggleUncertainty ? () => onToggleUncertainty(card) : undefined}
        onStar={onToggleBookmark ? () => onToggleBookmark(card) : undefined}
        helpActive={hasUncertainty}
        starActive={isBookmarked}
      />,
    );
  }

  if (activeImages.length > 0) {
    mediaActionNodes.push(
      <button
        key="images"
        onClick={(e) => {
          e.stopPropagation();
          onOpenImagePopup();
        }}
        className="flex items-center gap-1 px-2 py-1 h-8 min-h-0 min-w-0 rounded-full bg-indigo-500 text-white shadow-[0_2px_0_#4338ca] active:shadow-none active:translate-y-[2px] transition-all hover:bg-indigo-400 hover:shadow-[0_2px_0_#4338ca]"
      >
        <ImageIcon className={CARD_ACTION_ICON_CLASS} />
        <span className="text-[10px] font-bold">x{activeImages.length}</span>
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
        className="flex items-center gap-1 px-2 py-1 h-8 min-h-0 min-w-0 rounded-full transition-all bg-amber-500 text-white shadow-[0_2px_0_#b45309] active:shadow-none active:translate-y-[2px] hover:bg-amber-400 hover:shadow-[0_2px_0_#b45309]"
      >
        <Volume2 className={CARD_ACTION_ICON_CLASS} />
        <span className="text-[10px] font-bold">x{activeAudioUrls.length}</span>
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
        className="flex items-center gap-1 px-2 py-1 h-8 min-h-0 min-w-0 rounded-full transition-all bg-cyan-500 text-white shadow-[0_2px_0_#0e7490] active:shadow-none active:translate-y-[2px] hover:bg-cyan-400"
      >
        <Link className={CARD_ACTION_ICON_CLASS} />
        <span className="text-[10px] font-bold">
          x{activeReferences.length}
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

  if (onEdit && !previewMode) {
    actionsTopRight.push(
      <Button
        key="edit"
        variant="ghost"
        size="icon"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onEdit(card);
        }}
        className={cn(
          "rounded-none w-8 h-8 md:w-9 md:h-9 transition-colors",
          CARD_ACTION_BG_CLASS,
          CARD_ACTION_COLOR_IDLE_CLASS,
        )}
      >
        <Edit className={CARD_ACTION_ICON_CLASS} />
      </Button>,
    );
  }

  return {
    actionsTopLeft: actionsTopLeft.length > 0 ? actionsTopLeft : undefined,
    actionsTopRight: actionsTopRight.length > 0 ? actionsTopRight : undefined,
  };
}



