import React from "react";
import { cn } from "@/lib/utils";

type CardSurfaceProps = {
  children: React.ReactNode;
  className?: string;
  overlay?: React.ReactNode;
  /** 罫線背景を使う（今のFlashcardのやつ） */
  ruled?: boolean;
  /** 背景レイヤのopacity */
  ruledOpacity?: number;
  /** 罫線の行間(px) */
  ruledRowPx?: number;
};

export function CardSurface({
  children,
  className,
  overlay,
  ruled = true,
  ruledOpacity = 1,
  ruledRowPx = 24,
}: CardSurfaceProps) {
  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col px-2 md:px-3 pb-3 md:pb-4", className)}>
      {ruled && (
        <div
          className="absolute inset-0 bg-ruled bg-repeat-y pointer-events-none z-0"
          style={{ opacity: ruledOpacity, backgroundSize: `100% ${ruledRowPx}px` }}
        />
      )}

      {/* ここから先はコンテンツ */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      {overlay ? <div className="absolute inset-0 z-20">{overlay}</div> : null}
    </div>
  );
}
