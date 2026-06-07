import type React from "react";

export type VerticalCardPagerItemWidthSpec = { mode: "fixed"; widthPx: number } | { mode: "stretch" };

type Options<T> = { card: T; idx: number; isActive: boolean; cardWidth: number; getCardWidth?: (card: T, idx: number, isActive: boolean) => number; getCardWidthSpec?: (card: T, idx: number, isActive: boolean) => VerticalCardPagerItemWidthSpec };

const toFixed = (widthPx: number): VerticalCardPagerItemWidthSpec => ({ mode: "fixed", widthPx: Math.max(1, widthPx) });

export const resolveVerticalCardPagerItemWidthSpec = <T,>(options: Options<T>): VerticalCardPagerItemWidthSpec => {
  const { card, idx, isActive, cardWidth, getCardWidth, getCard