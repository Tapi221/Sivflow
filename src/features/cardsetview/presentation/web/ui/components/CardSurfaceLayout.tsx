import type { CSSProperties } from "react";
import React from "react";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { cn } from "@/lib/utils";

export type CardSurfaceFace = "question" | "answer";

export type CardSurfaceFaceAnchorProps = {
  face: CardSurfaceFace;
  fillHeight?: boolean;
  children: React.ReactNode;
};

export type CardSurfaceLayoutProps = {
  cardLayoutMode: CardLayoutMode;
  questionNode: React.ReactNode;
  answerNode: React.ReactNode;
  flipNode?: React.ReactNode;
  className?: string;
};

const SPLIT_INNER_SHADOW_CLIP_PX = 120;
const STACK_INNER_SHADOW_CLIP_PX = 120;
const SURFACE_DIVIDER_COVER_SIZE_PX = 2;
const SURFACE_DIVIDER_LINE_SIZE_PX = 0.5;

export const CardSurfaceFaceAnchor = ({
  face,
  fillHeight = false,
  children,
}: CardSurfaceFaceAnchorProps) => {
  return (
    <div
      data-card-face={face}
      className={cn("min-w-0", fillHeight && "h-full")}
    >
      {children}
    </div>
  );
};

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
      ["--card-stack-shell-clip" as string]: `inset(-${STACK_INNER_SHADOW_CLIP_PX}px -${STACK_INNER_SHADOW_CLIP_PX}px 0 -${STACK_INNER_SHADOW_CLIP_PX}px)`,
    } as CSSProperties);

  const rightSlotStyle = isSplitLayout
    ? {
      clipPath: `inset(-${SPLIT_INNER_SHADOW_CLIP_PX}px -${SPLIT_INNER_SHADOW_CLIP_PX}px -${SPLIT_INNER_SHADOW_CLIP_PX}px 0)`,
    }
    : ({
      ["--card-stack-shell-clip" as string]: `inset(0 -${STACK_INNER_SHADOW_CLIP_PX}px -${STACK_INNER_SHADOW_CLIP_PX}px -${STACK_INNER_SHADOW_CLIP_PX}px)`,
    } as CSSProperties);

  return (
    <div
      className={cn(
        "card-surface-layout relative w-full min-w-0 max-w-full overflow-visible",
        isSplitLayout
          ? "card-surface-layout--split grid grid-cols-2 gap-0 [&>.card-surface-layout__slot--question_.card-shell]:!border-r-0 [&>.card-surface-layout__slot--answer_.card-shell]:!border-l-0"
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

      {!isSplitLayout ? (
        <div
          aria-hidden
          className="pointer-events-none relative z-30 w-full bg-white"
          style={{
            height: `${SURFACE_DIVIDER_COVER_SIZE_PX}px`,
            marginBlock: `-${SURFACE_DIVIDER_COVER_SIZE_PX / 2}px`,
          }}
        >
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2"
            style={{
              height: `${SURFACE_DIVIDER_LINE_SIZE_PX}px`,
              background: "var(--card-border-default, rgba(15, 23, 42, 0.08))",
            }}
          />
        </div>
      ) : null}

      <div
        className="card-surface-layout__slot card-surface-layout__slot--answer relative min-w-0 overflow-visible"
        style={rightSlotStyle}
      >
        {answerNode}
      </div>

      {isSplitLayout ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
          style={{
            top: `${SURFACE_DIVIDER_COVER_SIZE_PX / 2}px`,
            bottom: `${SURFACE_DIVIDER_COVER_SIZE_PX / 2}px`,
            width: `${SURFACE_DIVIDER_LINE_SIZE_PX}px`,
            background: "var(--card-border-default, rgba(15, 23, 42, 0.08))",
          }}
        />
      ) : null}
    </div>
  );
};
