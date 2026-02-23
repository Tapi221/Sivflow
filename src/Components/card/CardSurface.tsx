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
  // 罫線を「行の下」に描画する（最後の1pxだけ線）
  // これにより文字を横切りにくく、視覚的ズレが減る。
  const lineColor = "rgba(0, 0, 0, 0.04)";
  const lineThicknessPx = 1;

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col px-2 md:px-3 pb-3 md:pb-4",
        className
      )}
    >
      {ruled && (
        <div
          className="absolute inset-0 bg-repeat-y pointer-events-none z-0"
          style={{
            opacity: ruledOpacity,
            // 罫線パターン（ruledRowPx ピッチ）: 行の下に 1px 線
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0,
              transparent calc(${ruledRowPx}px - ${lineThicknessPx}px),
              ${lineColor} calc(${ruledRowPx}px - ${lineThicknessPx}px),
              ${lineColor} ${ruledRowPx}px
            )`,
            backgroundSize: `100% ${ruledRowPx}px`,
            // コンテンツのtop paddingと罫線の開始位置を一致させる
            backgroundPosition: `0 ${ruledOffsetPx}px`,
          }}
        />
      )}

      {/* ここから先はコンテンツ */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      {overlay ? <div className="absolute inset-0 z-20">{overlay}</div> : null}
    </div>
  );
}