import { useLayoutEffect, useRef } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";

type Params = {
  activeMode: "timeline" | "calendar" | string;

  calendarBufferBefore: number;
  calendarDayColumnWidth: number;

  viewportWidth: number;

  timelineAnchorColumnIndex: number;
  timelineColumnWidth: number;

  scrollTargetToken?: number;

  scrollRef: React.RefObject<HTMLDivElement | null>;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  headerRefs?: React.RefObject<HTMLDivElement | null>[];
};

export const useCalendarScrollPositionSync = ({
  activeMode,
  calendarBufferBefore,
  calendarDayColumnWidth,
  viewportWidth,
  timelineAnchorColumnIndex,
  timelineColumnWidth,
  scrollTargetToken,
  scrollRef,
  headerRef,
  headerRefs,
}: Params) => {
  const lastRef = useRef<{
    token: number | null;
    viewportWidth: number;
  }>({
    token: null,
    viewportWidth: 0,
  });

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (viewportWidth <= 0) return;

    const currentToken = scrollTargetToken ?? 0;

    const { token, viewportWidth: prevWidth } = lastRef.current;

    const tokenChanged = token !== currentToken;
    const viewportChanged =
      token === currentToken && prevWidth !== viewportWidth;

    if (!tokenChanged && !viewportChanged) return;

    let nextScrollLeft = 0;

    if (activeMode === "timeline") {
      nextScrollLeft = timelineAnchorColumnIndex * timelineColumnWidth;
    } else {
      const anchorOffset = calendarBufferBefore * calendarDayColumnWidth;
      const availableWidth = Math.max(0, viewportWidth - C.TIME_COLUMN_WIDTH);
      const centerOffset = Math.max(
        0,
        (availableWidth - calendarDayColumnWidth) / 2,
      );

      nextScrollLeft = Math.max(0, anchorOffset - centerOffset);
    }

    scroller.scrollLeft = nextScrollLeft;

    const fixedRowRefs = headerRefs ?? (headerRef ? [headerRef] : []);

    fixedRowRefs.forEach((fixedRowRef) => {
      if (fixedRowRef.current) {
        fixedRowRef.current.scrollLeft = nextScrollLeft;
      }
    });

    lastRef.current = {
      token: currentToken,
      viewportWidth,
    };
  }, [
    activeMode,
    calendarBufferBefore,
    calendarDayColumnWidth,
    viewportWidth,
    timelineAnchorColumnIndex,
    timelineColumnWidth,
    scrollTargetToken,
    scrollRef,
    headerRef,
    headerRefs,
  ]);
};