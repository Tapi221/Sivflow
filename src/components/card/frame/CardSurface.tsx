import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { RuledLayer } from "./RuledLayer";
import { PositionalRuledLayer } from "./PositionalRuledLayer";

// Context for children (e.g., SharedCardContent) to trigger positional ruled rendering
export type CardRuledContextValue = {
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  setVisibleRules: (rules: number[]) => void;
};

const CardRuledContext = createContext<CardRuledContextValue | null>(null);

export function useCardRuledContext(): CardRuledContextValue | null {
  return useContext(CardRuledContext);
}

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

type CardSurfaceProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overlay?: React.ReactNode;
  /** 罫線背景を使う */
  ruled?: boolean;
  /** 背景レイヤのopacity */
  ruledOpacity?: number;
  /** 罫線の行間(px) */
  ruledRowPx?: number;
  /**
   * 罫線の開始Yオフセット(px)。
   * BlockEditorのtop paddingと合わせることでコンテンツと罫線を整合させる。
   */
  ruledOffsetPx?: number;
  /** カード下端から最後の罫線までのオフセット(px) */
  ruledBottomOffsetPx?: number;
  /** 罫線の位相オフセット(px)。未指定時は従来どおり 0。 */
  ruledPhasePx?: number;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function CardSurface({
  children,
  className,
  style,
  overlay,
  ruled = true,
  ruledOpacity = 1,
  ruledRowPx = 24,
  ruledOffsetPx = 0,
  ruledBottomOffsetPx = 0,
  ruledPhasePx = 0,
}: CardSurfaceProps) {
  const rowPx = Math.max(8, ruledRowPx);
  const topPx = Math.max(0, ruledOffsetPx);
  const bottomPx = Math.max(0, ruledBottomOffsetPx);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [visibleRules, setVisibleRules] = useState<number[] | null>(null);

  const contextValue = useMemo<CardRuledContextValue>(
    () => ({ surfaceRef, setVisibleRules }),
    [],
  );

  const surfaceStyle = useMemo(() => {
    const vars: CSSVars = {
      "--card-row-px": `${rowPx}px`,
      "--card-font-size": "16px",
      "--card-line-height": `${rowPx}px`,
      "--card-ruled-color": "rgba(0,0,0,0.05)",
      "--card-ruled-line-px": "1px",
      "--card-ruled-opacity": String(clamp01(ruledOpacity)),
      "--card-surface": "hsl(var(--background))",
      "--card-padding-x": "12px",
      "--card-padding-bottom": `${bottomPx}px`,
      "--ruled-offset-px": `${topPx}px`,
      "--ruled-bottom-offset-px": `${bottomPx}px`,
      "--card-content-padding-top": `${topPx}px`,
    };
    return { ...vars, ...(style ?? {}) } as CSSVars;
  }, [rowPx, topPx, bottomPx, ruledOpacity, style]);

  const opacity = clamp01(ruledOpacity);

  return (
    <CardRuledContext.Provider value={contextValue}>
      <div
        ref={surfaceRef}
        data-card-surface="true"
        className={cn("relative flex min-h-0 flex-1 flex-col", className)}
        style={{
          ...surfaceStyle,
          background: "var(--card-surface)",
          paddingLeft: "var(--card-padding-x)",
          paddingRight: "var(--card-padding-x)",
        }}
      >
        {ruled && visibleRules === null && (
          <RuledLayer
            kind="repeat+bottom"
            ruledOpacity={opacity}
            ruledRowPx={rowPx}
            ruledPhasePx={ruledPhasePx}
            ruledInsetX="var(--card-padding-x)"
            ruledOffsetPx={topPx}
            ruledBottomOffsetPx={bottomPx}
          />
        )}
        {ruled && visibleRules !== null && (
          <PositionalRuledLayer
            visibleRules={visibleRules}
            insetX="var(--card-padding-x)"
            opacity={opacity}
          />
        )}

        <div
          className="relative z-10 flex min-h-0 flex-1 flex-col"
          style={{ paddingBottom: "var(--card-padding-bottom)" }}
        >
          {children}
        </div>

        {overlay ? (
          <div className="pointer-events-none absolute inset-0 z-20">
            {overlay}
          </div>
        ) : null}
      </div>
    </CardRuledContext.Provider>
  );
}
