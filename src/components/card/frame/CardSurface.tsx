import React, { useMemo } from "react";
import { cn } from "@web-renderer/lib/utils";



type CSSVars = React.CSSProperties & Record<`--${string}`, string>;
type CardSurfaceProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overlay?: React.ReactNode;
  ruled?: boolean;
  ruledOpacity?: number;
  ruledRowPx?: number;
  ruledOffsetPx?: number;
  ruledBottomOffsetPx?: number;
  ruledPhasePx?: number;
};



const clamp01 = (n: number) => Math.min(1, Math.max(0, n));



const CardSurface = ({ children, className, style, overlay, ruled = true, ruledOpacity = 1, ruledRowPx = 24, ruledOffsetPx = 0, ruledBottomOffsetPx = 0, ruledPhasePx: _ruledPhasePx = 0 }: CardSurfaceProps) => {
  void _ruledPhasePx;
  const rowPx = Math.max(8, ruledRowPx);
  const topPx = Math.max(0, ruledOffsetPx);
  const bottomPx = Math.max(0, ruledBottomOffsetPx);
  const surfaceStyle = useMemo(() => {
    const vars: CSSVars = {
      "--card-row-px": `${rowPx}px`,
      "--card-font-size": "16px",
      "--card-line-height": `${rowPx}px`,
      "--card-ruled-color": "rgba(0,0,0,0.05)",
      "--card-ruled-line-px": ruled ? "1px" : "0px",
      "--card-ruled-opacity": String(clamp01(ruledOpacity)),
      "--card-surface": "hsl(var(--background))",
      "--card-padding-x": "12px",
      "--card-padding-bottom": `${bottomPx}px`,
      "--ruled-offset-px": `${topPx}px`,
      "--ruled-bottom-offset-px": `${bottomPx}px`,
      "--card-content-padding-top": `${topPx}px`,
    };
    return { ...vars, ...(style ?? {}) } as CSSVars;
  }, [bottomPx, rowPx, ruled, ruledOpacity, style, topPx]);
  const opacity = clamp01(ruledOpacity);
  const hasOverlay = overlay !== null && overlay !== undefined;
  return (
    <div
      data-card-surface="true"
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
      style={{
        ...surfaceStyle,
        background: "var(--card-surface)",
        paddingLeft: "var(--card-padding-x)",
        paddingRight: "var(--card-padding-x)",
      }}
    >
      {ruled && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10"
          style={{
            top: "var(--ruled-offset-px, 44px)",
            left: "var(--card-padding-x, 12px)",
            right: "var(--card-padding-x, 12px)",
            height: 1,
            background: "var(--card-ruled-color, rgba(0,0,0,0.05))",
            opacity,
          }}
        />
      )}
      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col"
        style={{ paddingBottom: "var(--card-padding-bottom)" }}
      >
        {children}
      </div>
      {hasOverlay && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {overlay}
        </div>
      )}
    </div>
  );
};



export { CardSurface };
