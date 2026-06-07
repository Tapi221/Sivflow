export type VerticalCardPagerItemWidthSpec = { mode: "fixed"; widthPx: number } | { mode: "stretch" };

type O<T> = { card: T; idx: number; isActive: boolean; cardWidth: number; getCardWidth?: (card: T, idx: number, isActive: boolean) => number; getCardWidthSpec?: (card: T, idx: number, isActive: boolean) => VerticalCardPagerItemWidthSpec };

export const resolveVerticalCardPagerItemWidthSpec = <T,>(o: O<T>): VerticalCardPagerItemWidthSpec => {
  const s = o.getCardWidthSpec?.(o.card, o.idx, o.isActive);
  if (s?.mode === "stretch") return { mode: "stretch" };
  const w = s?.mode === "fixed" ? s.widthPx : o.getCardWidth?.(o.card, o.idx, o.isActive) ?? o.cardWidth;
  return { mode: "fixed", widthPx: Math.max(1