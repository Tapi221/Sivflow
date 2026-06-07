export type VerticalCardPagerItemWidthSpec = { mode: "fixed"; widthPx: number } | { mode: "stretch" };

type O<T> = { card: T; idx: number; isActive: boolean; cardWidth: number; getCardWidth?: any; getCardWidthSpec?: any };

export const resolveVerticalCardPagerItemWidthSpec = <T,>(o: O<T>): VerticalCardPagerItemWidthSpec => {
  const s = o.getCardWidthSpec?.(o.card, o.idx,