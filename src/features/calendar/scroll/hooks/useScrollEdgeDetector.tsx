import { useCallback, useRef } from "react";
import type { UIEvent } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
type Params = {
  onExtendLeft: () => void;
  onExtendRight: () => void;
};

export const useScrollEdgeDetector = ({ onExtendLeft, onExtendRight }: Params) => {
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget;

      const distLeft = scroller.scrollLeft;
      const distRight =
        scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;

      if (
        distLeft < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;
        onExtendLeft();
      }

      if (
        distRight < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;
        onExtendRight();
      }
    },
    [onExtendLeft, onExtendRight],
  );

  const reset = useCallback(() => {
    isExtendingLeftRef.current = false;
    isExtendingRightRef.current = false;
  }, []);

  return {
    handleScroll,
    reset,
  };
};