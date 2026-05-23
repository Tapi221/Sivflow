import type { CSSProperties, RefObject, UIEvent } from "react";
import { Fragment, memo, useMemo } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import { cn } from "@/lib/utils";

import type {
  TimelineUnitBuffer,
  TimelineViewMode,
} from "./TimelineDayView.shared";
import {
  buildTimelineColumns,
  getTimelineColumnWidth,
} from "./TimelineDayView.shared";

type CalendarTimelineDayViewProps = {
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

const buildColumnGridBackground = (columnWidth: number) => {
  const borderStart = Math.max(0, columnWidth - 1);

  return `repeating-linear-gradient(to right, transparent 0, transparent ${borderStart}px, #eef0f3 ${borderStart}px, #eef0f3 ${columnWidth}px)`;
};

export const CalendarTimelineDayView = memo(function CalendarTimelineDayView({
  viewMode,
  anchorDate,
  timelineUnitBuffer,
  selectedDate,
  dayColumnWidth,
  laneLabelWidth = C.TIMELINE_DEFAULT_LANE_LABEL_WIDTH,
  rowCount = C.TIMELINE_DEFAULT_ROW_COUNT,
  scrollContainerRef,
  onScroll,
  onSelectDate,
}: CalendarTimelineDayViewProps) {
  const columns = useMemo(() => {
    return buildTimelineColumns(viewMode, anchorDate, timelineUnitBuffer);
  }, [anchorDate, timelineUnitBuffer, viewMode]);

  const columnWidth = useMemo(() => {
    return getTimelineColumnWidth(viewMode, dayColumnWidth);
  }, [dayColumnWidth, viewMode]);

  const rowIndexes = useMemo(() => {
    return Array.from({ length: rowCount }, (_, index) => index);
  }, [rowCount]);

  const selectedTime = selectedDate.getTime();
  const gridWidth = columns.length * columnWidth;

  const columnGridBackground = useMemo(() => {
    return buildColumnGridBackground(columnWidth);
  }, [columnWidth]);

  const scrollSurfaceStyle = useMemo<CSSProperties>(
    () => ({
      overscrollBehaviorX: "contain",
      willChange: "scroll-position",
    }),
    [],
  );

  const timelineRowStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: columnGridBackground,
      backgroundSize: `${columnWidth}px 100%`,
      contain: "layout paint",
      height: `${C.TIMELINE_DEFAULT_ROW_HEIGHT}px`,
      transform: "translateZ(0)",
      width: `${gridWidth}px`,
    }),
    [columnGridBackground, columnWidth, gridWidth],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
        onScroll={onScroll}
        style={scrollSurfaceStyle}
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
                height: `${C.TIMELINE_HEADER_HEIGHT}px`,
              }}
            >
              {columns.map((column) => {
                const isSelected =
                  selectedTime >= column.start.getTime() &&
                  selectedTime <= column.end.getTime();

                return (
                  <button
                    key={column.id}
                    type="button"
                    className={cn(
                      "flex h-10 flex-col items-center justify-center border-r border-[#e5e7eb] bg-white text-[12px] font-medium text-[#4c5361] last:border-r-0",
                      "transition-colors hover:bg-[#f4f5f7]",
                      "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      column.isToday && "bg-[#f0f6ff]",
                      !column.isToday && isSelected && "bg-[#f4f5f7]",
                    )}
                    onClick={() => onSelectDate?.(column.start)}
                  >
                    {column.kind === "day" ? (
                      <>
                        <CalendarDayNumberCircle
                          isToday={column.isToday}
                          isSelected={isSelected}
                        >
                          {column.topLabel}
                        </CalendarDayNumberCircle>
                        <span className="mt-0.5 text-[11px] font-medium leading-none text-[#8f929c]">
                          {column.bottomLabel}
                        </span>
                      </>
                    ) : column.kind === "week" ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#25272d]">
                        <span>{column.topLabel}</span>
                        <span className="text-[#8f929c]">~</span>
                        <span>{column.bottomLabel}</span>
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-[#25272d]">
                          {column.topLabel}
                        </span>
                        <span>{column.bottomLabel}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {rowIndexes.map((index) => (
            <Fragment key={index}>
              <div
                className="sticky left-0 z-10 border-b border-r border-[#e5e7eb] bg-white"
                style={{ height: `${C.TIMELINE_DEFAULT_ROW_HEIGHT}px` }}
              />

              <div
                className="relative border-b border-[#e5e7eb] bg-white"
                style={timelineRowStyle}
              />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
});