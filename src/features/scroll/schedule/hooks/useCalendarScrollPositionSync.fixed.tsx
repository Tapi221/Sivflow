import { useLayoutEffect, useRef } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarToolbarMode, CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

type Params = {
  activeMode: CalendarToolbarMode;
  selectedViewMode: CalendarViewMode;
  calendarBufferBefore: number;
  calendarDayColumnWidth: number;
  viewportWidth: number;
  scrollTargetToken?: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  headerRefs?: React.RefObject<HTMLDivElement | null>[];
};

const getCalendarScrollLeft = ({
  selectedViewMode,
  calendarBufferBefore,
  calendarDayColumnWidth,
  viewportWidth,
}: Pick<Params, "selectedViewMode" | "calendarBufferBefore" | "calendarDayColumnWidth" | "viewportWidth">) => {
  const anchorOffset = calendarBufferBefore * calendarDayColumnWidth;

  if (selectedViewMode === "week" || selectedViewMode === "threeDays") {
    return anchorOffset;
  }

  const viewportInlineInset = selectedViewMode === "month" ? 0 : C.WEEKDAY_SURFACE_LEFT_INSET_PX;
  const availableWidth = Math.max(0, viewportWidth - viewportInlineInset - C.TIME_COLUMN_WIDTH);
  const centerOffset = selectedViewMode === "days" ? 0 : Math.max(0, (availableWidth - calendarDayColumnWidth) / 2);

  return Math.max(0, anchorOffset - centerOffset);
};

export const useCalendarScrollPositionSync = ({
  activeMode,
  selectedViewMode,
  calendarBufferBefore,
  calendarDayColumnWidth,
  viewportWidth,
  scrollTargetToken,
  scrollRef,
  headerRef,
  headerRefs,
}: Params) => {
  const lastRef = useRef<{
    token: number | null;
    viewportWidth: number;
    activeMode: CalendarToolbarMode | null;
    selectedViewMode: CalendarViewMode | null;
  }>({
    token: null,
    viewportWidth: 0,
    activeMode: null,
    selectedViewMode: null,
  });

  useLayoutEffect(() => {
    if (activeMode !== "calendar") return;

    const scroller = scrollRef.current;
    if (!scroller) return;
    if (viewportWidth <= 0) return;

    const currentToken = scrollTargetToken ?? 0;
    const { token, viewportWidth: prevWidth, activeMode: prevActiveMode, selectedViewMode: prevSelectedViewMode } = lastRef.current;
    const tokenChanged = token !== currentToken;
    const viewportChanged = token === currentToken && prevWidth !== viewportWidth;
    const modeChanged = prevActiveMode !== activeMode;
    const viewModeChanged = prevSelectedViewMode !== selectedViewMode;

    if (!tokenChanged && !viewportChanged && !modeChanged && !viewModeChanged) {
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
      activeMode,
      selectedViewMode,
    };
  }, [activeMode, selectedViewMode, calendarBufferBefore, calendarDayColumnWidth, viewportWidth, scrollTargetToken, scrollRef, headerRef, headerRefs]);
};