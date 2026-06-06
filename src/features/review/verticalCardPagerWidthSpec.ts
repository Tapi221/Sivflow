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