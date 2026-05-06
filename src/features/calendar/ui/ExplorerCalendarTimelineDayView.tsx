import type { RefObject, UIEvent } from "react";
import { Fragment, useMemo } from "react";

import {
  buildTimelineColumns,
  getTimelineColumnWidth,
} from "./ExplorerCalendarTimelineDayView.shared";
import type {
  TimelineUnitBuffer,
  TimelineViewMode,
} from "./ExplorerCalendarTimelineDayView.shared";

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 168;
const DEFAULT_LANE_LABEL_WIDTH = 168;
const DEFAULT_ROW_COUNT = 4;

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

export const ExplorerCalendarTimelineDayView = ({
  viewMode,
  anchorDate,
  timelineUnitBuffer,
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
                  ]
                    .join(" ")
                    .trim()}
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
