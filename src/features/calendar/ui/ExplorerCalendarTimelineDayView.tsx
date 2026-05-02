import { Fragment } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import type { CSSProperties, RefObject, UIEvent } from "react";

import { cn } from "@/lib/utils";

export type TimelineDayLane = {
  id: string;
  label: string;
  countLabel: string;
  dotColorClassName: string;
};

export type TimelineDayBar = {
  id: string;
  laneId: string;
  title: string;
  startDayIndex: number;
  span: number;
  colorClassName: string;
};

type ExplorerCalendarTimelineDayViewProps = {
  visibleDays: Date[];
  selectedDate: Date;
  lanes: TimelineDayLane[];
  bars: TimelineDayBar[];
  dayColumnWidth: number;
  laneLabelWidth?: number;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSelectDate?: (date: Date) => void;
};

const HEADER_HEIGHT = 74;
const LANE_HEIGHT = 168;
const DEFAULT_LANE_LABEL_WIDTH = 168;

const getBarStyle = (
  startDayIndex: number,
  span: number,
  dayColumnWidth: number,
): CSSProperties => {
  const safeSpan = Math.max(1, span);

  return {
    left: `${startDayIndex * dayColumnWidth + 12}px`,
    width: `${safeSpan * dayColumnWidth - 24}px`,
    top: "42px",
  };
};

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const ExplorerCalendarTimelineDayView = ({
  visibleDays,
  selectedDate,
  lanes,
  bars,
  dayColumnWidth,
  laneLabelWidth = DEFAULT_LANE_LABEL_WIDTH,
  scrollContainerRef,
  onScroll,
  onSelectDate,
}: ExplorerCalendarTimelineDayViewProps) => {
  const gridWidth = visibleDays.length * dayColumnWidth;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
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

          {lanes.map((lane) => {
            const laneBars = bars.filter((bar) => bar.laneId === lane.id);

            return (
              <Fragment key={lane.id}>
                <div
                  className="sticky left-0 z-10 flex border-b border-r border-[#e8ebf0] bg-white"
                  style={{ height: `${LANE_HEIGHT}px` }}
                >
                  <div className="flex h-full w-full flex-col justify-start px-6 pt-9">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-block h-[10px] w-[10px] rounded-full",
                          lane.dotColorClassName,
                        )}
                      />
                      <span className="text-[16px] font-semibold leading-none text-[#20242c]">
                        {lane.label}
                      </span>
                    </div>

                    <span className="mt-4 pl-[22px] text-[16px] font-medium leading-none text-[#6b7280]">
                      {lane.countLabel}
                    </span>
                  </div>
                </div>

                <div
                  className="relative border-b border-[#e8ebf0] bg-white"
                  style={{
                    height: `${LANE_HEIGHT}px`,
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
                          key={`${lane.id}-${date.toISOString()}`}
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

                  <div className="absolute inset-0">
                    {laneBars.map((bar) => (
                      <div
                        key={bar.id}
                        className={cn(
                          "absolute flex h-[46px] items-center rounded-[8px] border px-5 text-[16px] font-medium leading-none text-[#2c3440] shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
                          bar.colorClassName,
                        )}
                        style={getBarStyle(
                          bar.startDayIndex,
                          bar.span,
                          dayColumnWidth,
                        )}
                        title={bar.title}
                      >
                        <span className="truncate">{bar.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
