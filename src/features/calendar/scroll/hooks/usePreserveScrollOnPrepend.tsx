import { useLayoutEffect, useRef } from "react";

type Params = {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  trigger: number; // visibleDays.length など
  enabled?: boolean;
};

export const usePreserveScrollOnPrepend = ({
  scrollerRef,
  trigger,
  enabled = true,
}: Params) => {
  const prevWidthRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const prevWidth = prevWidthRef.current;
    if (prevWidth === null) {
      prevWidthRef.current = scroller.scrollWidth;
      return;
    }

    const diff = scroller.scrollWidth - prevWidth;

    if (diff > 0) {
      scroller.scrollLeft += diff;
    }

    prevWidthRef.current = scroller.scrollWidth;
  }, [trigger, scrollerRef, enabled]);

  const reset = () => {
    prevWidthRef.current = null;
  };

  return { reset };
};