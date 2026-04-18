import type { CSSProperties } from "react";
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
const STACK_INNER_SHADOW_CLIP_PX = 120;

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
    : ({
        ["--card-stack-shell-clip" as string]:
          `inset(-${STACK_INNER_SHADOW_CLIP_PX}px -${STACK_INNER_SHADOW_CLIP_PX}px 0 -${STACK_INNER_SHADOW_CLIP_PX}px)`,
      } as CSSProperties);

  const rightSlotStyle = isSplitLayout
    ? {
        clipPath: `inset(-${SPLIT_INNER_SHADOW_CLIP_PX}px -${SPLIT_INNER_SHADOW_CLIP_PX}px -${SPLIT_INNER_SHADOW_CLIP_PX}px 0)`,
      }
    : ({
        ["--card-stack-shell-clip" as string]:
          `inset(0 -${STACK_INNER_SHADOW_CLIP_PX}px -${STACK_INNER_SHADOW_CLIP_PX}px -${STACK_INNER_SHADOW_CLIP_PX}px)`,
      } as CSSProperties);

  return (
    <div
      className={cn(
        "card-surface-layout w-full min-w-0 max-w-full overflow-visible",
        isSplitLayout
          ? "card-surface-layout--split grid grid-cols-2 gap-0"
          : "card-surface-layout--stack flex flex-col gap-0",
        className,
      )}
    >
      <div
        className="card-surface-layout__slot card-surface-layout__slot--question relative min-w-0 overflow-visible"
        style={leftSlotStyle}
      >
        {questionNode}
      </div>

      <div
        className="card-surface-layout__slot card-surface-layout__slot--answer relative min-w-0 overflow-visible"
        style={rightSlotStyle}
      >
        {answerNode}
      </div>
    </div>
  );
};
