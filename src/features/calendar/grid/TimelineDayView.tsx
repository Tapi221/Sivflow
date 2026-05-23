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

  const scrollSurfaceStyle = useMemo<CSSProperties>(
    () => ({
      overscrollBehaviorX: "contain",
      willChange: "scroll-position",
    }),
    [],
  );

  const columnGridStyle = useMemo<CSSProperties>(
    () => ({
      gridTemplateColumns: `repeat(${columns.length}, ${columnWidth}px)`,
      width: `${gridWidth}px`,
    }),
    [columnWidth, columns.length, gridWidth],
  );

  const timelineHeaderStyle = useMemo<CSSProperties>(
    () => ({
      ...columnGridStyle,
      height: `${C.TIMELINE_HEADER_HEIGHT}px`,
    }),
    [columnGridStyle],
  );

  const timelineRowStyle = useMemo<CSSProperties>(
    () => ({
      ...columnGridStyle,
      contain: "layout paint",
      height: `${C.TIMELINE_DEFAULT_ROW_HEIGHT}px`,
      transform: "translateZ(0)",
    }),
    [columnGridStyle],
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
          <div className="sticky left-0 top-0 z-20 border-b border-r border-[#eeeeee] bg-white" />

          <div className="sticky top-0 z-10 border-b border-[#eeeeee] bg-white">
            <div className="grid" style={timelineHeaderStyle}>
              {columns.map((column) => {
                const isSelected =
                  selectedTime >= column.start.getTime() &&
                  selectedTime <= column.end.getTime();

                return (
                  <div
                    key={column.id}
                    className={cn(
                      "flex h-10 select-none flex-col items-center justify-center bg-white text-[12px] font-medium text-[#4c5361]",
                      column.isToday && "bg-[#f0f6ff]",
                      !column.isToday && isSelected && "bg-[#f4f5f7]",
                    )}
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
                      <span className="inline-flex items-baseline whitespace-nowrap font-semibold text-[#25272d]">
                        <span>{column.topLabel}</span>
                        <span>{column.bottomLabel}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {rowIndexes.map((index) => (
            <Fragment key={index}>
              <div
                className="sticky left-0 z-10 border-b border-r border-[#eeeeee] bg-white"
                style={{ height: `${C.TIMELINE_DEFAULT_ROW_HEIGHT}px` }}
              />

              <div
                className="grid border-b border-[#eeeeee] bg-white"
                style={timelineRowStyle}
              >
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="border-r border-[#eeeeee] last:border-r-0"
                  />
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
});