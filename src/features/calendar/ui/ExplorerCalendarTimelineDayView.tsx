import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import type { RefObject, UIEvent } from "react";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

type ExplorerCalendarTimelineDayViewProps = {
  visibleDays: Date[];
  selectedDate: Date;
  dayColumnWidth: number;
  laneLabelWidth?: number;
  rowCount?: number;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSelectDate?: (date: Date) => void;
};

const HEADER_HEIGHT = 74;
const ROW_HEIGHT = 168;
const DEFAULT_LANE_LABEL_WIDTH = 168;
const DEFAULT_ROW_COUNT = 4;

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const ExplorerCalendarTimelineDayView = ({
  visibleDays,
  selectedDate,
  dayColumnWidth,
  laneLabelWidth = DEFAULT_LANE_LABEL_WIDTH,
  rowCount = DEFAULT_ROW_COUNT,
  scrollContainerRef,
  onScroll,
  onSelectDate,
}: ExplorerCalendarTimelineDayViewProps) => {
  const gridWidth = visibleDays.length * dayColumnWidth;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#e6eaf0] bg-white">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white"
        onScroll={onScroll}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${laneLabelWidth}px minmax(${gridWidth}px, max-content)`,
            minWidth: `${laneLabelWidth + gridWidth}px`,
          }}
        >
          <div className="sticky left-0 top-0 z-30 border-b border-r border-[#e8ebf0] bg-white" />

          <div className="sticky top-0 z-20 border-b border-[#e8ebf0] bg-white">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${visibleDays.length}, ${dayColumnWidth}px)`,
                width: `${gridWidth}px`,
                height: `${HEADER_HEIGHT}px`,
              }}
            >
              {visibleDays.map((date) => {
                const selected = isSameDay(date, selectedDate);
                const today = isSameDay(date, new Date());
                const weekend = isWeekend(date);

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={cn(
                      "relative flex flex-col items-center justify-start border-r border-[#eceff3] bg-white pt-4 text-center last:border-r-0",
                      weekend && "bg-[#fcfcfd]",
                      selected && "bg-[#fbfbfc]",
                    )}
                    onClick={() => onSelectDate?.(date)}
                  >
                    {today ? (
                      <div className="absolute inset-y-0 left-1/2 w-[68px] -translate-x-1/2 bg-[#f9ecec]" />
                    ) : null}

                    <span
                      className={cn(
                        "relative z-10 text-[29px] font-semibold leading-none tracking-[-0.02em] text-[#25272d]",
                        today &&
                          "inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[#ef5a57] px-2 text-white shadow-sm",
                      )}
                    >
                      {format(date, "d", { locale: ja })}
                    </span>

                    <span
                      className={cn(
                        "relative z-10 mt-2 text-[13px] font-medium leading-none text-[#4c5361]",
                        weekend && "text-[#6a7280]",
                      )}
                    >
                      {format(date, "E", { locale: ja })}
                    </span>
                  </button>
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
