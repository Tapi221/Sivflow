import React from "react";
import { cn } from "@/lib/utils";

type CardSurfaceProps = {
  children: React.ReactNode;
  className?: string;
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
  overlay,
  ruled = true,
  ruledOpacity = 1,
  ruledRowPx = 24,
  ruledOffsetPx = 0,
}: CardSurfaceProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col px-2 pb-3 md:px-3 md:pb-4",
        className
      )}
    >
      {ruled && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-repeat-y"
          style={{
            opacity: ruledOpacity,
            top: `${Math.max(0, ruledOffsetPx)}px`,
            // 罫線パターン（ruledRowPx ピッチ）
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.04),
              rgba(0, 0, 0, 0.04) 1px,
              transparent 1px,
              transparent ${ruledRowPx}px
            )`,
            backgroundSize: `100% ${ruledRowPx}px`,
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
