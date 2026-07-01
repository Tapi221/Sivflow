import { useCallback } from "react";



const useSyncHorizontalScroll = (sourceRef: React.RefObject<HTMLDivElement | null>, targetRef: React.RefObject<HTMLDivElement | null>) => {
  const sync = useCallback((scrollLeft: number) => {
    if (targetRef.current) {
      targetRef.current.scrollLeft = scrollLeft;
    }
  }, [targetRef]);

  const syncFromSource = useCallback(() => {
    if (!sourceRef.current || !targetRef.current) return;
    targetRef.current.scrollLeft = sourceRef.current.scrollLeft;
  }, [sourceRef, targetRef]);

  return {
    sync,
    syncFromSource,
  };
};



export { useSyncHorizontalScroll };
