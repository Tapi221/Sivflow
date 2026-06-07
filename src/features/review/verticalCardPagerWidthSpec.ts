import type React from "react";

export type VerticalCardPagerItemWidthSpec = { mode: "fixed"; widthPx: number } | { mode: "stretch" };

type Options<T> = { card: T; idx: number; isActive: boolean; cardWidth: number; getCardWidth?: (card: T, idx: number, isActive: boolean) => number; getCardWidthSpec?: (card: T, idx: number, isActive: boolean) => VerticalCardPagerItemWidthSpec };

export const resolveVerticalCardPagerItemWidthSpec = <T,>({ card, idx, isActive, cardWidth, getCardWidth, getCardWidthSpec }: Options<T>): VerticalCardPagerItemWidthSpec => {
  const spec = getCardWidthSpec?.(card, idx, isActive);
  if (spec?.mode === "stretch") return { mode: "stretch" };
