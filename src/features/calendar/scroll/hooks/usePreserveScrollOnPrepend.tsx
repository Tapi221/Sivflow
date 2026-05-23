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
  const prevSnapshotRef = useRef<{
    scrollWidth: number;
    scrollLeft: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      prevSnapshotRef.current = null;
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const prevSnapshot = prevSnapshotRef.current;
    if (prevSnapshot === null) {
      prevSnapshotRef.current = {
        scrollWidth: scroller.scrollWidth,
        scrollLeft: scroller.scrollLeft,
      };
      return;
    }

    const diff = scroller.scrollWidth - prevSnapshot.scrollWidth;

    if (diff > 0 && prevSnapshot.scrollLeft < scroller.scrollLeft) {
      scroller.scrollLeft += diff;
    }

    prevSnapshotRef.current = {
      scrollWidth: scroller.scrollWidth,
      scrollLeft: scroller.scrollLeft,
    };
  }, [trigger, scrollerRef, enabled]);

  const reset = () => {
    prevSnapshotRef.current = null;
  };

  return { reset };
};