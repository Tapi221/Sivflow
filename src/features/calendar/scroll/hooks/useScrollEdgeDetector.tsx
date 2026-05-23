import { useCallback, useRef } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";

type Params = {
  onExtendLeft: () => void;
  onExtendRight: () => void;
};

export const useScrollEdgeDetector = ({ onExtendLeft, onExtendRight }: Params) => {
  const leftPendingRef = useRef(false);
  const rightPendingRef = useRef(false);

  const handleScroll = useCallback(
    (scroller: HTMLDivElement) => {
      const leftDistance = scroller.scrollLeft;
      const rightDistance =
        scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;

      if (leftDistance >= C.TIMELINE_EDGE_THRESHOLD_PX) {
        leftPendingRef.current = false;
      }

      if (rightDistance >= C.TIMELINE_EDGE_THRESHOLD_PX) {
        rightPendingRef.current = false;
      }

      if (leftDistance < C.TIMELINE_EDGE_THRESHOLD_PX && !leftPendingRef.current) {
        leftPendingRef.current = true;
        onExtendLeft();
      }

      if (rightDistance < C.TIMELINE_EDGE_THRESHOLD_PX && !rightPendingRef.current) {
        rightPendingRef.current = true;
        onExtendRight();
      }
    },
    [onExtendLeft, onExtendRight],
  );

  const reset = useCallback(() => {
    leftPendingRef.current = false;
    rightPendingRef.current = false;
  }, []);

  return {
    handleScroll,
    reset,
  };
};