import type React from "react";

export type VerticalCardPagerItemWidthSpec =
  | { mode: "fixed"; widthPx: number }
  | { mode: "stretch" };

type ResolveVerticalCardPagerItemWidthSpecOptions<T> = {
  card: T;
  idx: number;
  isActive: boolean;
  cardWidth: number;
  getCardWidth?: (card: T, idx: number, isActive: boolean) => number;
  getCardWidthSpec?: (
    card: T,
    idx: number,
    isActive: boolean,
  ) => VerticalCardPagerItemWidthSpec;
};

const sanitizeVerticalCardPagerItemWidthSpec = (
  widthSpec: VerticalCardPagerItemWidthSpec,
): VerticalCardPagerItemWidthSpec => {
  if (widthSpec.mode === "stretch") {
    return { mode: "stretch" };
  }

  return {
    mode: "fixed",
    widthPx: Math.max(1, Math.round(widthSpec.widthPx)),
  };
};

export const resolveVerticalCardPagerItemWidthSpec = <T,>({
  card,
  idx,
  isActive,
  cardWidth,
  getCardWidth,
  getCardWidthSpec,
}: ResolveVerticalCardPagerItemWidthSpecOptions<T>): VerticalCardPagerItemWidthSpec => {
  if (getCardWidthSpec) {
    return sanitizeVerticalCardPagerItemWidthSpec(
      getCardWidthSpec(card, idx, isActive),
    );
  }

  const resolvedWidthPx = getCardWidth
    ? getCardWidth(card, idx, isActive)
    : cardWidth;

  return sanitizeVerticalCardPagerItemWidthSpec({
    mode: "fixed",
    widthPx: resolvedWidthPx,
  });
};

export const buildVerticalCardPagerItemStyle = (
  widthSpec: VerticalCardPagerItemWidthSpec,
): React.CSSProperties =>
  widthSpec.mode === "stretch"
    ? { width: "100%", maxWidth: "100%", minWidth: 0, alignSelf: "stretch" }
    : {
        width: widthSpec.widthPx,
        maxWidth: "100%",
        minWidth: 0,
        alignSelf: "center",
      };
