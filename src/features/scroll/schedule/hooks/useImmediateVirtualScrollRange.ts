import { useCallback, useEffect, useRef } from "react";



type HookConfig<E extends HTMLElement> = {
  updateRange: (element: E | null) => void;
  onDeferredScroll?: (element: E) => void;
  resetKey?: unknown;
};



const useImmediateVirtualScrollRange = <E extends HTMLElement>(config: HookConfig<E>) => {
  const updateRangeRef = useRef(config.updateRange);
  const onDeferredScrollRef = useRef(config.onDeferredScroll);
  const pendingElementRef = useRef<E | null>(null);
  const frameRef = useRef<number | null>(null);
  updateRangeRef.current = config.updateRange;
  onDeferredScrollRef.current = config.onDeferredScroll;
  const cancelDeferredScroll = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingElementRef.current = null;
  }, []);
  const flushDeferredScroll = useCallback(() => {
    const element = pendingElementRef.current;
    frameRef.current = null;
    pendingElementRef.current = null;
    if (!element) return;
    onDeferredScrollRef.current?.(element);
  }, []);
  const handleScrollElement = useCallback((element: E) => {
    updateRangeRef.current(element);
    if (!onDeferredScrollRef.current) return;
    pendingElementRef.current = element;
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(flushDeferredScroll);
  }, [flushDeferredScroll]);
  useEffect(() => {
    cancelDeferredScroll();
  }, [cancelDeferredScroll, config.resetKey]);
  useEffect(() => cancelDeferredScroll, [cancelDeferredScroll]);
  return { handleScrollElement };
};



export { useImmediateVirtualScrollRange };
