import { useCallback } from "react";



type HookConfig<E extends HTMLElement> = {
  updateRange: (element: E | null) => void;
  onDeferredScroll?: (element: E) => void;
};



const useImmediateVirtualScrollRange = <E extends HTMLElement>(config: HookConfig<E>) => {
  const handleScrollElement = useCallback((element: E) => {
    config.updateRange(element);
    config.onDeferredScroll?.(element);
  }, [config]);

  return { handleScrollElement };
};



export { useImmediateVirtualScrollRange };
