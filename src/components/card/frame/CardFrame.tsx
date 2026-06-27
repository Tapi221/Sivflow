import React from "react";
import { cn } from "@web-renderer/lib/utils";
import { CardShell } from "./CardShell";
import { CardSurface } from "./CardSurface";
import { ScaleToFitFrame } from "./ScaleToFitFrame";
import { CARD_BASE_WIDTH, CARD_DISPLAY_SCALE, CARD_ROW_PX, CARD_RULED_OFFSET_BOTTOM_PX, CARD_RULED_OFFSET_TOP_PX } from "@/domain/card/cardGeometry.constants";
import type { CssVars } from "@/types/style";



type CardShellProps = React.ComponentProps<typeof CardShell>;
interface CardFrameProps extends Omit<CardShellProps, "children" | "className" | "ref"> {
  children: React.ReactNode;
  baseWidth?: number;
  contentPaddingPx?: number;
  allowUpscale?: boolean;
  maxScale?: number;
  scaleMultiplier?: number;
  fixedScale?: number;
  disableScale?: boolean;
  stretchWidth?: boolean;
  fitHeight?: boolean;
  className?: string;
  ruled?: boolean;
  ruledRowPx?: number;
  ruledOffsetPx?: number;
  ruledOpacity?: number;
  ruledBottomOffsetPx?: number;
  ruledPhasePx?: number;
  overlay?: React.ReactNode;
  topAttachment?: React.ReactNode;
}



const CardFrame = React.forwardRef<HTMLDivElement, CardFrameProps>(
  (
    {
      children,
      baseWidth = CARD_BASE_WIDTH,
      contentPaddingPx = 12,
      allowUpscale = true,
      maxScale = 1.6,
      scaleMultiplier = CARD_DISPLAY_SCALE,
      fixedScale,
      disableScale = false,
      stretchWidth = false,
      fitHeight = false,
      className,
      ruled = true,
      ruledRowPx = CARD_ROW_PX,
      ruledOffsetPx = CARD_RULED_OFFSET_TOP_PX,
      ruledBottomOffsetPx = CARD_RULED_OFFSET_BOTTOM_PX,
      ruledPhasePx = 0,
      ruledOpacity = 1,
      overlay,
      topAttachment,
      heightPx = null,
      lockHeight = false,
      style,
      ...shellProps
    },
    ref,
  ) => {
    const hasTopAttachment = topAttachment !== null && topAttachment !== undefined;
    return (
      <ScaleToFitFrame
        baseWidth={baseWidth}
        contentPaddingPx={contentPaddingPx}
        allowUpscale={allowUpscale}
        maxScale={maxScale}
        scaleMultiplier={scaleMultiplier}
        fixedScale={fixedScale}
        disableScale={disableScale}
        fitHeight={fitHeight}
        intrinsicHeightPx={
          lockHeight &&
            typeof heightPx === "number" &&
            Number.isFinite(heightPx) &&
            heightPx > 0
            ? heightPx
            : null
        }
      >
        <div
          className={cn(
            "mx-auto",
            stretchWidth && "min-w-0",
            fitHeight && "h-full",
          )}
          style={{
            width: stretchWidth ? "100%" : `${Math.max(1, baseWidth)}px`,
            maxWidth: stretchWidth ? "100%" : undefined,
            minWidth: stretchWidth ? 0 : undefined,
            height: fitHeight ? "100%" : undefined,
          }}
        >
          {hasTopAttachment && (
            <div className="w-full overflow-visible">{topAttachment}</div>
          )}
          {(() => {
            const shellStyle: CssVars = {
              ...(style as React.CSSProperties | undefined),
              ...(stretchWidth
                ? {
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                }
                : {}),
              ...(fitHeight
                ? {
                  height: "100%",
                }
                : {}),
              "--card-base-width": `${Math.max(1, baseWidth)}px`,
            };
            return (
              <CardShell
                ref={ref}
                className={cn(
                  "mx-auto border-none",
                  stretchWidth && "min-w-0 max-w-full",
                  fitHeight && "h-full",
                  className,
                )}
                style={shellStyle}
                heightPx={heightPx}
                lockHeight={lockHeight}
                {...shellProps}
              >
                <CardSurface
                  ruled={ruled}
                  ruledRowPx={ruledRowPx}
                  ruledOffsetPx={ruledOffsetPx}
                  ruledBottomOffsetPx={ruledBottomOffsetPx}
                  ruledPhasePx={ruledPhasePx}
                  ruledOpacity={ruledOpacity}
                  overlay={overlay}
                >
                  {children}
                </CardSurface>
              </CardShell>
            );
          })()}
        </div>
      </ScaleToFitFrame>
    );
  },
);



CardFrame.displayName = "CardFrame";

export { CardFrame };


export type { CardFrameProps };
