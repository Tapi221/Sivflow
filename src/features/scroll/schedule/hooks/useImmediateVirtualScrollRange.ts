import { useCallback } from "react";

type ScrollElement = HTMLElement;

export type ImmediateVirtualScrollRangeOptions<TElement extends ScrollElement> = {
  updateRange: (element: TElement | null) => void;
  onDeferredScroll?: (element: TElement) => void;
};

function useImmediateVirtualScrollRange<TElement extends ScrollElement>(options: ImmediateVirtualScrollRangeOptions<TElement>) {
  const handleScrollElement = useCallback((element: TElement) => {
    options