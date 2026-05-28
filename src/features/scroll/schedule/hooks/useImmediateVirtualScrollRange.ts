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
  const pendingElementRef = useRef<TElement | null>(null);

  const scheduleDeferredScroll = useCallback((element: TElement) => {
    pendingElementRef.current = element;

    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const pendingElement = pendingElementRef.current;
      pendingElementRef.current = null;

      if (!pendingElement) return;

      onDeferredScroll?.(pendingElement);
    });
  }, [onDeferredScroll]);

  const handleScrollElement = useCallback((element: TElement) => {
    updateRange(element);
    scheduleDeferredScroll(element);
  }, [scheduleDeferredScroll, updateRange]);

  useEffect(() => {
    return () => {
      if (frameRef.current === null) return;

      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      pendingElementRef.current = null;
    };
  }, []);

  return { handleScrollElement };
};