import { useLayoutEffect, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";



type Params = {
  selectedViewMode: CalendarViewMode;
  calendarBufferBefore: number;
  calendarDayColumnWidth: number;
  viewportWidth: number;
  scrollTargetToken?: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  headerRefs?: React.RefObject<HTMLDivElement | null>[];
};



const isViewportRenderedWeekdayViewMode = (viewMode: CalendarViewMode): boolean =>
  viewMode === "days" ||
  viewMode === "threeDays" ||
  viewMode === "week" ||
  viewMode === "timetable";
const getCalendarScrollLeft = ({
  selectedViewMode,
  calendarBufferBefore,
  calendarDayColumnWidth,
  viewportWidth,
}: Pick<Params, "selectedViewMode" | "calendarBufferBefore" | "calendarDayColumnWidth" | "viewportWidth">) => {
  if (isViewportRenderedWeekdayViewMode(selectedViewMode)) {
    return 0;
  }

  const anchorOffset = calendarBufferBefore * calendarDayColumnWidth;
  const viewportInlineInset = selectedViewMode === "month" ? 0 : C.WEEKDAY_SURFACE_LEFT_INSET_PX;
  const availableWidth = Math.max(0, viewportWidth - viewportInlineInset - C.TIME_COLUMN_WIDTH);
  const centerOffset = Math.max(0, (availableWidth - calendarDayColumnWidth) / 2);

  return Math.max(0, anchorOffset - centerOffset);
};
const useCalendarScrollPositionSync = ({ selectedViewMode, calendarBufferBefore, calendarDayColumnWidth, viewportWidth, scrollTargetToken, scrollRef, headerRef, headerRefs }: Params) => {
  const lastRef = useRef<{ token: number | null;
    viewportWidth: number;
    selectedViewMode: CalendarViewMode | null;
  }>({
    token: null,
    viewportWidth: 0,
    selectedViewMode: null,
  });

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (viewportWidth <= 0) return;

    const currentToken = scrollTargetToken ?? 0;
    const { token, viewportWidth: prevWidth, selectedViewMode: prevSelectedViewMode } = lastRef.current;
    const tokenChanged = token !== currentToken;
    const viewportChanged = token === currentToken && prevWidth !== viewportWidth;
    const viewModeChanged = prevSelectedViewMode !== selectedViewMode;

    if (!tokenChanged && !viewportChanged && !viewModeChanged) {
      return;
    }

    const nextScrollLeft = getCalendarScrollLeft({
      selectedViewMode,
      calendarBufferBefore,
      calendarDayColumnWidth,
      viewportWidth,
    });

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
      selectedViewMode,
    };
  }, [selectedViewMode, calendarBufferBefore, calendarDayColumnWidth, viewportWidth, scrollTargetToken, scrollRef, headerRef, headerRefs]);
};



export { useCalendarScrollPositionSync };
