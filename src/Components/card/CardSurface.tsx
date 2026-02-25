import React from "react";
import { cn } from "@/lib/utils";

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
   * デフォルト: 0
   */
  ruledOffsetPx?: number;
};

export function CardSurface({
  children,
  className,
  style,
  overlay,
  ruled = true,
  ruledOpacity = 1,
  ruledRowPx = 24,
  ruledOffsetPx = 0,
}: CardSurfaceProps) {
  const surfaceStyle = {
    '--card-row-px': `${ruledRowPx}px`,
    '--card-font-size': '16px',
    '--card-line-height': `${ruledRowPx}px`,
    '--card-padding-x': '12px',
    '--card-padding-bottom': '16px',
    '--ruled-offset-px': `${Math.max(0, ruledOffsetPx)}px`,
    '--card-content-padding-top': `${Math.max(0, ruledOffsetPx)}px`,
    ...style,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col",
        className
      )}
      style={{
        ...surfaceStyle,
        paddingLeft: 'var(--card-padding-x)',
        paddingRight: 'var(--card-padding-x)',
        paddingBottom: 'var(--card-padding-bottom)',
      }}
    >
      {ruled && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-repeat-y"
          style={{
            opacity: ruledOpacity,
            top: 'var(--ruled-offset-px)',
            // 罫線パターン（ruledRowPx ピッチ）
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.04),
              rgba(0, 0, 0, 0.04) 1px,
              transparent 1px,
              transparent ${ruledRowPx}px
            )`,
            backgroundSize: '100% var(--card-row-px)',
          }}
        />
      )}

      {/* ここから先はコンテンツ */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {children}
      </div>

      {overlay ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}
