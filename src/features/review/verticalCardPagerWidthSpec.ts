import type { CSSProperties } from "react";



type VerticalCardPagerItemWidthSpec = {
  mode: "fixed"; widthPx: number; } | { mode: "stretch"; };
type ResolveVerticalCardPagerItemWidthSpecOptions<T> = {
  card: T;
  idx: number;
  isActive: boolean;
  cardWidth: number;
  getCardWidth?: (card: T, idx: number, isActive: boolean) => number;
  getCardWidthSpec?: (card: T, idx: number, isActive: boolean) => VerticalCardPagerItemWidthSpec;
};



const clampWidthPx = (widthPx: number): number => Math.max(1, widthPx);
const resolveFixedWidthSpec = (widthPx: number): VerticalCardPagerItemWidthSpec => ({
  mode: "fixed",
  widthPx: clampWidthPx(widthPx),
});
const resolveVerticalCardPagerItemWidthSpec = <T>({ card, idx, isActive, cardWidth, getCardWidth, getCardWidthSpec }: ResolveVerticalCardPagerItemWidthSpecOptions<T>): VerticalCardPagerItemWidthSpec => {
  const widthSpec = getCardWidthSpec?.(card, idx, isActive);

  if (widthSpec?.mode === "stretch") {
    return { mode: "stretch" };
  }

  if (widthSpec?.mode === "fixed") {
    return resolveFixedWidthSpec(widthSpec.widthPx);
  }

  const resolvedWidth = getCardWidth?.(card, idx, isActive) ?? cardWidth;
  return resolveFixedWidthSpec(resolvedWidth);
};
const buildVerticalCardPagerItemStyle = (widthSpec: VerticalCardPagerItemWidthSpec): CSSProperties => {
  if (widthSpec.mode === "stretch") {
    return { width: "100%", maxWidth: "100%", minWidth: 0, alignSelf: "stretch" };
  }

  return {
    width: widthSpec.widthPx,
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "center",
  };
};



export { resolveVerticalCardPagerItemWidthSpec, buildVerticalCardPagerItemStyle };


export type { VerticalCardPagerItemWidthSpec };
