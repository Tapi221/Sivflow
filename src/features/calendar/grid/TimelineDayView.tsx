import type { RefObject, UIEvent } from "react";
import { Fragment, useMemo } from "react";

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

export const CalendarTimelineDayView = ({
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
}: CalendarTimelineDayViewProps) => {
  const columns = useMemo(() => {
    return buildTimelineColumns(viewMode, anchorDate, timelineUnitBuffer);
  }, [anchorDate, timelineUnitBuffer, viewMode]);

  const columnWidth = useMemo(() => {
    return getTimelineColumnWidth(viewMode, dayColumnWidth);
  }, [dayColumnWidth, viewMode]);

  const selectedTime = selectedDate.getTime();
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
          <div className="sticky left-0 top-0 z-20 border-b border-r border-[#b7b7b7] bg-white" />

          <div className="sticky top-0 z-10 border-b border-[#b7b7b7] bg-white">
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
                      "flex h-10 flex-col items-center justify-center border-r border-[#b7b7b7] bg-white text-[12px] font-medium text-[#4c5361] last:border-r-0",
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

          {Array.from({ length: rowCount }, (_, index) => (
            <Fragment key={index}>
              <div
                className="sticky left-0 z-10 border-b border-r border-[#b7b7b7] bg-white"
                style={{ height: `${C.TIMELINE_DEFAULT_ROW_HEIGHT}px` }}
              />

              <div
                className="relative border-b border-[#b7b7b7] bg-white"
                style={{
                  height: `${C.TIMELINE_DEFAULT_ROW_HEIGHT}px`,
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
                      className="relative border-r border-[#b7b7b7] last:border-r-0"
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
