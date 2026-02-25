import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

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
}: CardSurfaceProps) {
  const rowPx = Math.max(8, ruledRowPx);
  const topPx = Math.max(0, ruledOffsetPx);
  const bottomPx = Math.max(0, ruledBottomOffsetPx);

  const surfaceStyle = useMemo(() => {
    const vars: CSSVars = {
      "--card-row-px": `${rowPx}px`,
      "--card-font-size": "16px",
      "--card-line-height": `${rowPx}px`,
      "--card-padding-x": "12px",
      "--card-padding-bottom": "16px",
      "--ruled-offset-px": `${topPx}px`,
      "--ruled-bottom-offset-px": `${bottomPx}px`,
      "--card-content-padding-top": `${topPx}px`,
    };
    return { ...vars, ...(style ?? {}) } as CSSVars;
  }, [rowPx, topPx, bottomPx, style]);

  return (
    <div
      data-card-surface="true"
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
      style={{
        ...surfaceStyle,
        paddingLeft: "var(--card-padding-x)",
        paddingRight: "var(--card-padding-x)",
        paddingBottom: "var(--card-padding-bottom)",
      }}
    >
      {ruled && (
        <div
          className="pointer-events-none absolute inset-x-0 z-0"
          style={{
            top: "var(--ruled-offset-px)",
            bottom: "var(--ruled-bottom-offset-px)",
            opacity: clamp01(ruledOpacity),
            // 上端は繰り返し罫線に任せ、下端のみ固定線を追加して 44px を厳密に合わせる
            backgroundImage: `
              linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.05)),
              repeating-linear-gradient(
                to bottom,
                rgba(0,0,0,0.05),
                rgba(0,0,0,0.05) 1px,
                transparent 1px,
                transparent var(--card-row-px)
              )
            `,
            backgroundSize: "100% 1px, 100% var(--card-row-px)",
            backgroundPosition: "0 100%, 0 0",
            backgroundRepeat: "no-repeat, repeat-y",
          }}
        />
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {children}
      </div>

      {overlay ? (
        <div className="pointer-events-none absolute inset-0 z-20">{overlay}</div>
      ) : null}
    </div>
  );
}
