import React from 'react';
import { cn } from '@/lib/utils';
import { ScaleToFitFrame } from '@/Components/card/ScaleToFitFrame';
import { CardShell } from '@/Components/card/CardShell';
import { CardSurface } from '@/Components/card/CardSurface';
import {
  CARD_BASE_WIDTH,
  CARD_ROW_PX,
  CARD_TOP_PADDING_PX,
} from '@/Components/card/constants';

type CardShellProps = React.ComponentProps<typeof CardShell>;

export interface CardFrameProps
  extends Omit<CardShellProps, 'children' | 'className' | 'ref'> {
  children: React.ReactNode;
  baseWidth?: number;
  contentPaddingPx?: number;
  className?: string;
  ruled?: boolean;
  ruledRowPx?: number;
  ruledOffsetPx?: number;
  ruledOpacity?: number;
  overlay?: React.ReactNode;
  footerLeft?: React.ReactNode;
}

export const CardFrame = React.forwardRef<HTMLDivElement, CardFrameProps>(
  (
    {
      children,
      baseWidth = CARD_BASE_WIDTH,
      contentPaddingPx = 12,
      className,
      ruled = true,
      ruledRowPx = CARD_ROW_PX,
      ruledOffsetPx = CARD_TOP_PADDING_PX,
      ruledOpacity = 1,
      overlay,
      footerLeft,
      style,
      ...shellProps
    },
    ref
  ) => {
    return (
      <ScaleToFitFrame baseWidth={baseWidth} contentPaddingPx={contentPaddingPx}>
        <div className="mx-auto">
          <CardShell
            ref={ref}
            className={cn(
              'mx-auto border-none rounded-[32px] md:rounded-[40px]',
              className
            )}
            style={{
              ...(style as React.CSSProperties | undefined),
              ['--card-base-width' as any]: `${Math.max(1, baseWidth)}px`,
            }}
            actionsBottomLeft={footerLeft}
            {...shellProps}
          >
            <CardSurface
              ruled={ruled}
              ruledRowPx={ruledRowPx}
              ruledOffsetPx={ruledOffsetPx}
              ruledOpacity={ruledOpacity}
              overlay={overlay}
            >
              {children}
            </CardSurface>
          </CardShell>
        </div>
      </ScaleToFitFrame>
    );
  }
);

CardFrame.displayName = 'CardFrame';
