import React from 'react';
import { cn } from '@/lib/utils';
import { ScaleToFitFrame } from '@/Components/card/ScaleToFitFrame';
import { CardShell } from '@/Components/card/CardShell';
import { CardSurface } from '@/Components/card/CardSurface';
import { CARD_ROW_PX, CARD_TOP_PADDING_PX } from '@/Components/card/constants';

type CardShellProps = React.ComponentProps<typeof CardShell>;

export interface CardFrameProps
  extends Omit<CardShellProps, 'children' | 'className' | 'ref'> {
  children: React.ReactNode;
  baseWidth?: number;
  className?: string;
  ruled?: boolean;
  ruledRowPx?: number;
  ruledOffsetPx?: number;
  ruledOpacity?: number;
  overlay?: React.ReactNode;
  shellRef?: React.Ref<HTMLDivElement>;
}

export function CardFrame({
  children,
  baseWidth = 480,
  className,
  ruled = true,
  ruledRowPx = CARD_ROW_PX,
  ruledOffsetPx = CARD_TOP_PADDING_PX,
  ruledOpacity = 1,
  overlay,
  shellRef,
  ...shellProps
}: CardFrameProps) {
  return (
    <ScaleToFitFrame baseWidth={baseWidth}>
      <CardShell
        ref={shellRef}
        className={cn(
          'mx-auto border-none rounded-[32px] md:rounded-[40px]',
          className
        )}
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
    </ScaleToFitFrame>
  );
}
