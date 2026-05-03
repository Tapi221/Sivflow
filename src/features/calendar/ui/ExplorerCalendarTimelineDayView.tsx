import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { RefObject, UIEvent } from "react";
import { Fragment, useMemo } from "react";

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 168;
const DEFAULT_LANE_LABEL_WIDTH = 168;
const DEFAULT_ROW_COUNT = 4;
const WEEK_STARTS_ON_MONDAY = 1;

export type TimelineViewMode = "month" | "week" | "days";

export type TimelineUnitBuffer = {
  before: number;
  after: number;
};

export type TimelineColumn = {
  id: string;
  start: Date;
  end: Date;
  topLabel: string;
  bottomLabel: string;
  isToday: boolean;
  kind: "month" | "week" | "day";
};

type ExplorerCalendarTimelineDayViewProps = {
  viewMode: TimelineViewMode;
  anchorDate: Date;
  timelineUnitBuffer: TimelineUnitBuffer;
  selectedDate: Date;
  dayColumnWidth: number;
  laneLabelWidth?: number;
  rowCount?: number;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSelectDate?: (date: Date) => void;
};

const buildMonthColumns = (
  anchorDate: Date,
  buffer: TimelineUnitBuffer,
) => {
  const columns: TimelineColumn[] = [];
  const anchorStart = startOfMonth(anchorDate);
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addMonths(anchorStart, offset);
    const end = endOfMonth(start);

    columns.push({
      id: `month-${start.toISOString()}`,
      start,
      end,
      topLabel: format(start, "yyyy/M", { locale: ja }),
      bottomLabel: "月",
      isToday: isSameMonth(start, today),
      kind: "month",
    });
  }

  return columns;
};

const buildWeekColumns = (
  anchorDate: Date,
  buffer: TimelineUnitBuffer,
) => {
  const columns: TimelineColumn[] = [];
  const anchorStart = startOfWeek(anchorDate, {
    weekStartsOn: WEEK_STARTS_ON_MONDAY,
  });
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addDays(anchorStart, offset * 7);
    const end = endOfWeek(start, {
      weekStartsOn: WEEK_STARTS_ON_MONDAY,
    });

    columns.push({
      id: `week-${start.toISOString()}`,
      start,
      end,
      topLabel: format(start, "M/d", { locale: ja }),
      bottomLabel: format(end, "M/d", { locale: ja }),
      isToday: today >= start && today <= end,
      kind: "week",
    });
  }

  return columns;
};

const buildDayColumns = (
  anchorDate: Date,
  buffer: TimelineUnitBuffer,
) => {
  const columns: TimelineColumn[] = [];
  const anchorStart = startOfDay(anchorDate);
  const today = new Date();

  for (let offset = -buffer.before; offset <= buffer.after; offset += 1) {
    const start = addDays(anchorStart, offset);

    columns.push({
      id: `day-${start.toISOString()}`,
      start,
      end: start,
      topLabel: format(start, "d", { locale: ja }),
      bottomLabel: format(start, "E", { locale: ja }),
      isToday: isSameDay(start, today),
      kind: "day",
    });
  }

  return columns;
};

export const buildTimelineColumns = (
  viewMode: TimelineViewMode,
  anchorDate: Date,
  buffer: TimelineUnitBuffer,
) => {
  if (viewMode === "month") {
    return buildMonthColumns(anchorDate, buffer);
  }

  if (viewMode === "week") {
    return buildWeekColumns(anchorDate, buffer);
  }

  return buildDayColumns(anchorDate, buffer);
};

export const getTimelineColumnWidth = (
  viewMode: TimelineViewMode,
  dayColumnWidth: number,
) => {
  if (viewMode === "month") {
    return Math.max(168, Math.round(dayColumnWidth * 1.6));
  }

  if (viewMode === "week") {
    return Math.max(132, Math.round(dayColumnWidth * 1.2));
  }

  return dayColumnWidth;
};

export const getTimelineAnchorColumnIndex = (
  columns: TimelineColumn[],
  selectedDate: Date,
) => {
  const selectedTime = selectedDate.getTime();
  const matchIndex = columns.findIndex((column) => {
    return (
      selectedTime >= column.start.getTime() &&
      selectedTime <= column.end.getTime()
    );
  });

  return matchIndex >= 0 ? matchIndex : 0;
};

export const ExplorerCalendarTimelineDayView = ({
  viewMode,
  anchorDate,
  timelineUnitBuffer,
  selectedDate,
  dayColumnWidth,
  laneLabelWidth = DEFAULT_LANE_LABEL_WIDTH,
  rowCount = DEFAULT_ROW_COUNT,
  scrollContainerRef,
  onScroll,
  onSelectDate,
}: ExplorerCalendarTimelineDayViewProps) => {
  const columns = useMemo(() => {
    return buildTimelineColumns(viewMode, anchorDate, timelineUnitBuffer);
  }, [anchorDate, timelineUnitBuffer, viewMode]);

  const columnWidth = useMemo(() => {
    return getTimelineColumnWidth(viewMode, dayColumnWidth);
  }, [dayColumnWidth, viewMode]);

  const gridWidth = columns.length * columnWidth;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
        onScroll={onScroll}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${laneLabelWidth}px minmax(${gridWidth}px, max-content)`,
            minWidth: `${laneLabelWidth + gridWidth}px`,
          }}
        >
          <div className="sticky left-0 top-0 z-20 border-b border-r border-[#e5e7eb] bg-white" />

          <div className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, ${columnWidth}px)`,
                width: `${gridWidth}px`,
                height: `${HEADER_HEIGHT}px`,
              }}
            >
              {columns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  className={[
                    "flex h-10 flex-col items-center justify-center border-r border-[#e5e7eb] bg-white text-[12px] font-medium text-[#4c5361] last:border-r-0",
                    column.isToday ? "bg-[#fdf2f2]" : "",
                  ].join(" ").trim()}
                  onClick={() => onSelectDate?.(column.start)}
                >
                  <span className="font-semibold text-[#25272d]">
                    {column.topLabel}
                  </span>
                  <span>{column.bottomLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {Array.from({ length: rowCount }, (_, index) => (
            <Fragment key={index}>
              <div
                className="sticky left-0 z-10 border-b border-r border-[#e5e7eb] bg-white"
                style={{ height: `${ROW_HEIGHT}px` }}
              />

              <div
                className="relative border-b border-[#e5e7eb] bg-white"
                style={{
                  height: `${ROW_HEIGHT}px`,
                  width: `${gridWidth}px`,
                }}
              >
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `repeat(${columns.length}, ${columnWidth}px)`,
                  }}
                >
                  {columns.map((column) => (
                    <div
                      key={`${index}-${column.id}`}
                      className="relative border-r border-[#eef0f3] last:border-r-0"
                    />
                  ))}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
