import { useCallback, useEffect, useRef } from "react";

export type ImmediateVirtualScrollRangeOptions<TElement extends HTMLElement> = {
  updateRange: (element: TElement | null) => void;
  onDeferredScroll?: (element: TElement) => void;
};

export const useImmediateVirtualScrollRange = <TElement extends HTMLElement>({
  updateRange,
  onDeferredScroll,
}: ImmediateVirtualScrollRangeOptions<TElement>) => {
  const frameRef = useRef<number | null>(null);
  const