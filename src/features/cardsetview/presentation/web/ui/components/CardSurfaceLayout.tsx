import { cn } from "@/lib/utils";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import React from "react";

export type CardSurfaceLayoutProps = {
  cardLayoutMode: CardLayoutMode;
  questionNode: React.ReactNode;
  answerNode: React.ReactNode;
  flipNode?: React.ReactNode;
  className?: string;
};

const SPLIT_INNER_SHADOW_CLIP_PX = 120;

export const CardSurfaceLayout = ({
  cardLayoutMode,
  questionNode,
  answerNode,
  flipNode,
  className,
}: CardSurfaceLayoutProps) => {
  if (cardLayoutMode === "flip") {
    return (
      <div
        className={cn("w-full min-w-0 max-w-full overflow-visible", className)}
      >
        {flipNode ?? questionNode}
      </div>
    );
  }

  const isSplitLayout = cardLayoutMode === "split";

  const leftSlotStyle = isSplitLayout
    ? {
        clipPath: `inset(-${SPLIT_INNER_SHADOW_CLIP_PX}px 0 -${SPLIT_INNER_SHADOW_CLIP_PX}px -${SPLIT_INNER_SHADOW_CLIP_PX}px)`,
      }
    : undefined;

  const rightSlotStyle = isSplitLayout
    ? {
        clipPath: `inset(-${SPLIT_INNER_SHADOW_CLIP_PX}px -${SPLIT_INNER_SHADOW_CLIP_PX}px -${SPLIT_INNER_SHADOW_CLIP_PX}px 0)`,
      }
    : undefined;

  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full overflow-visible",
        isSplitLayout ? "grid grid-cols-2 gap-0" : "flex flex-col gap-0",
        className,
      )}
    >
      <div
        className="relative min-w-0 overflow-visible"
        style={leftSlotStyle}
      >
        {questionNode}
      </div>

      <div
        className="relative min-w-0 overflow-visible"
        style={rightSlotStyle}
      >
        {answerNode}
      </div>
    </div>
  );
};