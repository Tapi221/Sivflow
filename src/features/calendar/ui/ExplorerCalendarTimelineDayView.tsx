import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import type { RefObject, UIEvent } from "react";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

type ExplorerCalendarTimelineDayViewProps = {
  visibleDays: Date[];
  dayColumnWidth: number;
  laneLabelWidth?: number;
  rowCount?: number;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
};

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 168;
const DEFAULT_LANE_LABEL_WIDTH = 168;
const DEFAULT_ROW_COUNT = 4;

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const ExplorerCalendarTimelineDayView = ({
  visibleDays,
  dayColumnWidth,
  laneLabelWidth = DEFAULT_LANE_LABEL_WIDTH,
  rowCount = DEFAULT_ROW_COUNT,
  scrollContainerRef,
  onScroll,
}: ExplorerCalendarTimelineDayViewProps) => {
  const gridWidth = visibleDays.length * dayColumnWidth;

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
                gridTemplateColumns: `repeat(${visibleDays.length}, ${dayColumnWidth}px)`,
                width: `${gridWidth}px`,
                height: `${HEADER_HEIGHT}px`,
              }}
            >
              {visibleDays.map((date) => {
                const today = isSameDay(date, new Date());

                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      "sticky top-0 z-10 flex h-10 flex-col items-center justify-center border-r border-[#e5e7eb] bg-white text-[12px] font-medium text-[#4c5361] last:border-r-0",
                      today && "bg-[#fdf2f2]",
                    )}
                  >
                    <span className="font-semibold text-[#25272d]">
                      {format(date, "d", { locale: ja })}
                    </span>
                    <span>
                      {format(date, "E", { locale: ja })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {Array.from({ length: rowCount }, (_, index) => (
            <Fragment key={index}>
              <div
                className="sticky left-0 z-10 border-b border-r border-[#e8ebf0] bg-white"
                style={{ height: `${ROW_HEIGHT}px` }}
              />

              <div
                className="relative border-b border-[#e8ebf0] bg-white"
                style={{
                  height: `${ROW_HEIGHT}px`,
                  width: `${gridWidth}px`,
                }}
              >
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `repeat(${visibleDays.length}, ${dayColumnWidth}px)`,
                  }}
                >
                  {visibleDays.map((date) => {
                    const today = isSameDay(date, new Date());
                    const weekend = isWeekend(date);

                    return (
                      <div
                        key={`${index}-${date.toISOString()}`}
                        className={cn(
                          "relative border-r border-[#eceff3] last:border-r-0",
                          weekend && "bg-[#fcfcfd]",
                        )}
                      >
                        {today ? (
                          <div className="absolute inset-y-0 left-1/2 w-[68px] -translate-x-1/2 bg-[#f9ecec]" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
