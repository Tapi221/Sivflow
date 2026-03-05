import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getRuledStyle, type RuledStyleKind } from './ruledStyles';

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

type RuledLayerProps = {
  className?: string;
  kind?: RuledStyleKind;
  ruledOpacity?: number | string;
  ruledRowPx?: number;
  ruledPhasePx?: number;
  ruledInsetX?: number | string;
  ruledOffsetPx?: number;
  ruledBottomOffsetPx?: number;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 実際の高さ H から bottom_line_y を計算: floor((H - 1) / rowPx) * rowPx */
function calcBottomLinePx(heightPx: number, rowPx: number, phasePx: number): number {
  return Math.floor((heightPx - 1 - phasePx) / rowPx) * rowPx + phasePx;
}

export function RuledLayer({
  className,
  kind = 'repeat+bottom',
  ruledOpacity,
  ruledRowPx = 24,
  ruledPhasePx = 0,
  ruledInsetX = 0,
  ruledOffsetPx = 0,
  ruledBottomOffsetPx = 0,
}: RuledLayerProps) {
  const rowPx = Math.max(8, ruledRowPx);
  const topPx = Math.max(0, ruledOffsetPx);
  const bottomPx = Math.max(0, ruledBottomOffsetPx);

  const divRef = useRef<HTMLDivElement>(null);
  const [heightPx, setHeightPx] = useState<number | null>(null);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? el.getBoundingClientRect().height;
      setHeightPx(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bottomLinePx =
    kind === 'repeat+bottom' && heightPx !== null
      ? calcBottomLinePx(heightPx, rowPx, ruledPhasePx)
      : null;

  const layerStyle: CSSVars = {
    '--card-row-px': `${rowPx}px`,
    '--card-ruled-phase-px': `${ruledPhasePx}px`,
    left: typeof ruledInsetX === 'number' ? `${ruledInsetX}px` : String(ruledInsetX),
    right: typeof ruledInsetX === 'number' ? `${ruledInsetX}px` : String(ruledInsetX),
    top: `${topPx}px`,
    bottom: `${bottomPx}px`,
    opacity:
      typeof ruledOpacity === 'number'
        ? String(clamp01(ruledOpacity))
        : (ruledOpacity ?? 'var(--card-ruled-opacity, 1)'),
    ...getRuledStyle(kind, bottomLinePx),
  };

  return (
    <div
      ref={divRef}
      className={cn('ruledLayer pointer-events-none absolute z-0', className)}
      style={layerStyle}
    />
  );
}
