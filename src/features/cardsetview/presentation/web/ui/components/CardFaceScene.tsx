import {
  SharedCardContent,
  type SharedCardContentProps,
} from "@/components/card/common/SharedCardContent";
import { CANONICAL_CARD_WIDTH } from "@constants/shared/cardGeometry";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { cn } from "@/lib/utils";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import React from "react";

export type CardFaceSceneProps = Readonly<{
  displayMode: CardDisplayMode;
  fixedScale?: number;
  contentZoom: number;
  contentProps: SharedCardContentProps;
  actionsTopLeft?: React.ReactNode;
  actionsTopRight?: React.ReactNode;
  overlay?: React.ReactNode;
  topAttachment?: React.ReactNode;
  contentWrapperRef?: React.RefObject<HTMLDivElement | null>;
  frameClassName?: string;
  role?: React.AriaRole;
  tabIndex?: number;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onPointerDownCapture?: React.PointerEventHandler<HTMLDivElement>;
  onPointerMoveCapture?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUpCapture?: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancelCapture?: React.PointerEventHandler<HTMLDivElement>;
  resizable?: boolean;
  showResizeHandle?: boolean;
  resizeStepPx?: number;
  heightPx?: number | null;
  lockHeight?: boolean;
  onHeightChange?: (heightPx: number) => void;
  onMinHeightChange?: (heightPx: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}>;

export const CardFaceScene = ({
  displayMode,
  fixedScale,
  contentZoom,
  contentProps,
  actionsTopLeft,
  actionsTopRight,
  overlay,
  topAttachment,
  contentWrapperRef,
  frameClassName,
  role,
  tabIndex,
  onClick,
  onKeyDown,
  onPointerDownCapture,
  onPointerMoveCapture,
  onPointerUpCapture,
  onPointerCancelCapture,
  resizable = false,
  showResizeHandle = false,
  resizeStepPx,
  heightPx = null,
  lockHeight = false,
  onHeightChange,
  onMinHeightChange,
  onResizeStart,
  onResizeEnd,
}: CardFaceSceneProps) => {
  const isFluidDisplay = displayMode === "fluid";
  const resolvedFrameClassName = cn(
    isFluidDisplay && "rounded-none border-none bg-transparent shadow-none",
    frameClassName,
  );

  return (
    <div className="w-full min-w-0 max-w-full overflow-visible">
      <CardFrame
        baseWidth={CANONICAL_CARD_WIDTH}
        contentPaddingPx={0}
        allowUpscale={false}
        maxScale={4}
        scaleMultiplier={1}
        fixedScale={fixedScale}
        disableScale={isFluidDisplay}
        stretchWidth={isFluidDisplay}
        className={resolvedFrameClassName}
        ruled={!isFluidDisplay}
        topAttachment={topAttachment}
        overlay={overlay}
        role={role}
        tabIndex={tabIndex}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onPointerDownCapture={onPointerDownCapture}
        onPointerMoveCapture={onPointerMoveCapture}
        onPointerUpCapture={onPointerUpCapture}
        onPointerCancelCapture={onPointerCancelCapture}
        resizable={resizable}
        showResizeHandle={showResizeHandle}
        resizeStepPx={resizeStepPx}
        heightPx={heightPx}
        lockHeight={lockHeight}
        onHeightChange={onHeightChange}
        onMinHeightChange={onMinHeightChange}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
        actionsTopLeft={actionsTopLeft}
        actionsTopRight={actionsTopRight}
      >
        <div
          ref={contentWrapperRef}
          className={cn(
            "w-full min-w-0 max-w-full",
            isFluidDisplay ? "min-h-0" : "flex min-h-0 flex-1",
          )}
        >
          <SharedCardContent
            {...contentProps}
            displayMode={displayMode}
            zoom={isFluidDisplay ? contentZoom : 1}
          />
        </div>
      </CardFrame>
    </div>
  );
};
