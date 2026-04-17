import React from "react";
import { cn } from "@/lib/utils";
import { ScaleToFitFrame } from "@/components/card/frame/ScaleToFitFrame";
import { CardShell } from "@/components/card/frame/CardShell";
import { CardSurface } from "@/components/card/frame/CardSurface";
import type { CssVars } from "@/types/style";
import {
  CARD_BASE_WIDTH,
  CARD_DISPLAY_SCALE,
  CARD_RULED_OFFSET_BOTTOM_PX,
  CARD_ROW_PX,
  CARD_RULED_OFFSET_TOP_PX,
} from "@constants/shared/flashcard";

type CardShellProps = React.ComponentProps<typeof CardShell>;

export interface CardFrameProps extends Omit<
  CardShellProps,
  "children" | "className" | "ref"
> {
  children: React.ReactNode;
  baseWidth?: number;
  contentPaddingPx?: number;
  allowUpscale?: boolean;
  maxScale?: number;
  scaleMultiplier?: number;
  fixedScale?: number;
  disableScale?: boolean;
  stretchWidth?: boolean;
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

export const CardFrame = React.forwardRef<HTMLDivElement, CardFrameProps>(
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
      className,
      ruled = true,
      ruledRowPx = CARD_ROW_PX,
      ruledOffsetPx = CARD_RULED_OFFSET_TOP_PX,
      ruledBottomOffsetPx = CARD_RULED_OFFSET_BOTTOM_PX,
      ruledPhasePx = 0,
      ruledOpacity = 1,
      overlay,
      topAttachment,
      style,
      ...shellProps
    },
    ref,
  ) => {
    return (
      <ScaleToFitFrame
        baseWidth={baseWidth}
        contentPaddingPx={contentPaddingPx}
        allowUpscale={allowUpscale}
        maxScale={maxScale}
        scaleMultiplier={scaleMultiplier}
        fixedScale={fixedScale}
        disableScale={disableScale}
      >
        <div
          className={cn("mx-auto", stretchWidth && "min-w-0")}
          style={{
            width: stretchWidth ? "100%" : `${Math.max(1, baseWidth)}px`,
            maxWidth: stretchWidth ? "100%" : undefined,
            minWidth: stretchWidth ? 0 : undefined,
          }}
        >
          {topAttachment ? (
            <div className="w-full overflow-visible">{topAttachment}</div>
          ) : null}
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
              "--card-base-width": `${Math.max(1, baseWidth)}px`,
            };

            return (
              <CardShell
                ref={ref}
                className={cn(
                  "mx-auto border-none rounded-[24px] md:rounded-[28px]",
                  stretchWidth && "min-w-0 max-w-full",
                  className,
                )}
                style={shellStyle}
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
