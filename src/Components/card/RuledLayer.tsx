import React from 'react';
import { cn } from '@/lib/utils';
import { getRuledStyle, type RuledStyleKind } from './ruledStyles';

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

type RuledLayerProps = {
  className?: string;
  kind?: RuledStyleKind;
  ruledOpacity?: number | string;
  ruledRowPx?: number;
  ruledInsetX?: number | string;
  ruledOffsetPx?: number;
  ruledBottomOffsetPx?: number;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function RuledLayer({
  className,
  kind = 'repeat+bottom',
  ruledOpacity,
  ruledRowPx = 24,
  ruledInsetX = 0,
  ruledOffsetPx = 0,
  ruledBottomOffsetPx = 0,
}: RuledLayerProps) {
  const rowPx = Math.max(8, ruledRowPx);
  const topPx = Math.max(0, ruledOffsetPx);
  const bottomPx = Math.max(0, ruledBottomOffsetPx);

  const layerStyle: CSSVars = {
    '--card-row-px': `${rowPx}px`,
    left: typeof ruledInsetX === 'number' ? `${ruledInsetX}px` : String(ruledInsetX),
    right: typeof ruledInsetX === 'number' ? `${ruledInsetX}px` : String(ruledInsetX),
    top: `${topPx}px`,
    bottom: `${bottomPx}px`,
    opacity:
      typeof ruledOpacity === 'number'
        ? String(clamp01(ruledOpacity))
        : (ruledOpacity ?? 'var(--card-ruled-opacity, 1)'),
    ...getRuledStyle(kind),
  };

  return (
    <div
      className={cn('pointer-events-none absolute z-0', className)}
      style={layerStyle}
    />
  );
}
