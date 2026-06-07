import type React from "react";

export type VerticalCardPagerItemWidthSpec = { mode: "fixed"; widthPx: number } | { mode: "stretch" };

type Options<T> = { card: T; idx: number; isActive: boolean; cardWidth: number; getCardWidth?: (card: T, idx: number, isActive: boolean) => number; getCardWidthSpec?: (card: T, idx: number, isActive: boolean) => VerticalCardPagerItemWidthSpec };

export const resolve