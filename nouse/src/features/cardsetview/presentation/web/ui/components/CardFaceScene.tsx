import React from "react";
import { cn } from "@web-renderer/lib/utils";
import type { SharedCardContentProps } from "@/components/card/common/SharedCardContent";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type CardFaceSceneProps = Readonly<{ displayMode: CardDisplayMode;
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
  fillHeight?: boolean;
  onHeightChange?: (heightPx: number) => void;
  onMinHeightChange?: (heightPx: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}>;



const CardFaceScene = ({ displayMode, fixedScale, contentZoom, contentProps, actionsTopLeft, actionsTopRight, overlay, topAttachment, contentWrapperRef, frameClassName, role, tabIndex, onClick, onKeyDown, onPointerDownCapture, onPointerMoveCapture, onPointerUpCapture, onPointerCancelCapture, resizable = false, showResizeHandle = false, resizeStepPx, heightPx = null, lockHeight = false, fillHeight = false, onHeightChange, onMinHeightChange, onResizeStart, onResizeEnd }: CardFaceSceneProps) => {
  const isFluidDisplay = displayMode === "fluid";
  const shouldFillHeight = isFluidDisplay && fillHeight;
  const resolvedFrameClassName = cn(
    isFluidDisplay &&
    "rounded-none md:rounded-none border-none bg-transparent shadow-none",
    shouldFillHeight && "h-full",
    frameClassName,
  );

  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full overflow-visible",
        shouldFillHeight && "h-full",
      )}
    >
      <CardFrame
        baseWidth={CANONICAL_CARD_WIDTH}
        contentPaddingPx={0}
        allowUpscale={false}
        maxScale={4}
        scaleMultiplier={1}
        fixedScale={fixedScale}
        disableScale={isFluidDisplay}
        stretchWidth={isFluidDisplay}
        fitHeight={shouldFillHeight}
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
            shouldFillHeight
              ? "flex h-full min-h-0 flex-1 flex-col"
              : isFluidDisplay
                ? "min-h-0"
                : "flex min-h-0 flex-1",
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



export { CardFaceScene };


export type { CardFaceSceneProps };
