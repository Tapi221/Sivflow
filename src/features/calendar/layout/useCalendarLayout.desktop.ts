import * as C from "@/features/calendar/calendar.constants.desktop";
import * as GRID from "@/features/calendar/grid/grid.layout.constants.desktop";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

const WEEKDAY_HEADER_ROW_HEIGHT_PX = 40;
const WEEKDAY_BODY_ROW_BOTTOM_SPACER_HEIGHT_PX = 32;
const WEEKDAY_BODY_ROW_HEIGHT = `calc(${GRID.WEEKDAY_HOURS} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}) + ${WEEKDAY_BODY_ROW_BOTTOM_SPACER_HEIGHT_PX}px)`;
const WEEKDAY_GRID_TEMPLATE_ROWS = `${WEEKDAY_HEADER_ROW_HEIGHT_PX}px auto ${WEEKDAY_BODY_ROW_HEIGHT}`;

export const useCalendarLayout = ({
  viewportWidth,
  visibleDays,
  displayDays,
  selectedViewMode,
  currentDate,
  calendarBuffer: _calendarBuffer,
}: {
  viewportWidth: number;
  visibleDays: Date[];
  displayDays: Date[];
  selectedViewMode: CalendarViewMode;
  currentDate: Date;
  calendarBuffer: { before: number; after: number };
}) => {
  const isMonthLikeView = selectedViewMode === "month" || selectedViewMode === "list";
  const viewportDayCount =
    isMonthLikeView ? 7 : displayDays.length;

  const viewportInlineInset =
    isMonthLikeView ? 0 : C.WEEKDAY_SURFACE_LEFT_INSET_PX;

  const calendarDayColumnWidth =
    viewportWidth > C.TIME_COLUMN_WIDTH + viewportInlineInset
      ? Math.max(
        1,
        (viewportWidth - viewportInlineInset - C.TIME_COLUMN_WIDTH) /
          Math.max(1, viewportDayCount),
      )
      : C.DAY_COLUMN_MIN_WIDTH;

  const renderDayCount =
    isMonthLikeView ? displayDays.length : visibleDays.length;

  const gridWidth =
    C.TIME_COLUMN_WIDTH + renderDayCount * calendarDayColumnWidth;

  const titleDate =
    isMonthLikeView ? new Date(currentDate) : currentDate;

  const monthLabel = null;

  const calendarGridStyle = {
    [GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT]: `${C.DEFAULT_HOUR_ROW_HEIGHT}px`,
    gridTemplateColumns: `${C.TIME_COLUMN_WIDTH}px repeat(${renderDayCount}, ${calendarDayColumnWidth}px)`,
    gridTemplateRows: WEEKDAY_GRID_TEMPLATE_ROWS,
    minWidth: `${gridWidth}px`,
  } as const;

  return {
    calendarDayColumnWidth,
    calendarGridStyle,
    titleDate,
    monthLabel,
  };
};
