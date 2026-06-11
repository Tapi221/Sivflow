import type { CSSProperties } from "react";
import { getRuledStyle } from "@/components/card/frame/ruledStyles";

type RuledTextareaStyleParams = Readonly<{
  rowPx: number;
  offsetPx?: number;
  color?: string;
  linePx?: number;
  includeBottomLine?: boolean;
}>;

const DEFAULT_RULED_TEXTAREA_COLOR = "rgba(0,0,0,0.05)";
const DEFAULT_RULED_TEXTAREA_LINE_PX = 1;

const toBackgroundOffset = (offsetPx: number) =>
  `0 ${Number(offsetPx.toFixed(3))}px`;

const buildRuledTextareaStyle = ({
  rowPx,
  offsetPx = 0,
  color = DEFAULT_RULED_TEXTAREA_COLOR,
  linePx = DEFAULT_RULED_TEXTAREA_LINE_PX,
  includeBottomLine = false,
}: RuledTextareaStyleParams): CSSProperties => {
  const style = getRuledStyle({
    kind: includeBottomLine ? "repeat+bottom" : "repeat-only",
    rowPx,
    phasePx: 0,
    color,
    linePx,
    bottomLinePx: null,
  });

  return {
    ...style,
    backgroundPosition: includeBottomLine
      ? `0 calc(100% - ${linePx}px), ${toBackgroundOffset(offsetPx)}`
      : toBackgroundOffset(offsetPx),
    backgroundAttachment: "local",
  };
};

export { buildRuledTextareaStyle };
