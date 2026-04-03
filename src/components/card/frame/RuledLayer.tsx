import React from "react";
import { cn } from "@/lib/utils";
import { getRuledStyle, type RuledStyleKind } from "./ruledStyles";

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
  /** 罫線の色。デフォルト: rgba(0,0,0,0.05) */
  ruledColor?: string;
  /** 罫線の太さ(px)。デフォルト: 1 */
  ruledLinePx?: number;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const RuledLayer = ({
  className,
  kind = "repeat+bottom",
  ruledOpacity,
  ruledRowPx = 24,
  ruledPhasePx = 0,
  ruledInsetX = 0,
  ruledOffsetPx = 0,
  ruledBottomOffsetPx = 0,
  ruledColor = "rgba(0,0,0,0.05)",
  ruledLinePx = 1,
}: RuledLayerProps) => {
  const rowPx = Math.max(8, ruledRowPx);
  const topPx = Math.max(0, ruledOffsetPx);
  const bottomPx = Math.max(0, ruledBottomOffsetPx);

  const insetBase = {
    left:
      typeof ruledInsetX === "number"
        ? `${ruledInsetX}px`
        : String(ruledInsetX),
    right:
      typeof ruledInsetX === "number"
        ? `${ruledInsetX}px`
        : String(ruledInsetX),
    top: `${topPx}px`,
  } as const;

  const opacityValue =
    typeof ruledOpacity === "number"
      ? String(clamp01(ruledOpacity))
      : (ruledOpacity ?? "var(--card-ruled-opacity, 1)");

  // repeat+bottom の場合はレイヤーを分離して、繰り返し線と最下線の重なりを防ぐ。
  if (kind === "repeat+bottom") {
    const repeatStyle: CSSVars = {
      "--card-row-px": `${rowPx}px`,
      "--card-ruled-phase-px": `${ruledPhasePx}px`,
      ...insetBase,
      bottom: `${bottomPx + ruledLinePx}px`,
      opacity: opacityValue,
      ...getRuledStyle({
        kind: "repeat-only",
        rowPx,
        phasePx: ruledPhasePx,
        color: ruledColor,
        linePx: ruledLinePx,
        bottomLinePx: null,
      }),
    };

    const bottomStyle: CSSVars = {
      "--card-row-px": `${rowPx}px`,
      "--card-ruled-phase-px": `${ruledPhasePx}px`,
      ...insetBase,
      bottom: `${bottomPx}px`,
      opacity: opacityValue,
      ...getRuledStyle({
        kind: "bottom-only",
        rowPx,
        phasePx: ruledPhasePx,
        color: ruledColor,
        linePx: ruledLinePx,
        bottomLinePx: null,
      }),
    };

    return (
      <>
        <div
          className={cn(
            "ruledLayer pointer-events-none absolute z-0",
            className,
          )}
          style={repeatStyle}
        />
        <div
          className="ruledLayer pointer-events-none absolute z-0"
          style={bottomStyle}
        />
      </>
    );
  }

  const layerStyle: CSSVars = {
    "--card-row-px": `${rowPx}px`,
    "--card-ruled-phase-px": `${ruledPhasePx}px`,
    ...insetBase,
    bottom: `${bottomPx}px`,
    opacity: opacityValue,
    ...getRuledStyle({
      kind,
      rowPx,
      phasePx: ruledPhasePx,
      color: ruledColor,
      linePx: ruledLinePx,
      bottomLinePx: null,
    }),
  };

  return (
    <div
      className={cn("ruledLayer pointer-events-none absolute z-0", className)}
      style={layerStyle}
    />
  );
};
