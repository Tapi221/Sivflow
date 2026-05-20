import type { RefObject, UIEvent } from "react";
import { Fragment, useMemo } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";

import * as C from "@/features/calendar/calendar.constants.desktop";

type CalendarTaskViewProps = {
  anchorDate: Date;
  selectedDate: Date;
  dayColumnWidth: number;
  rowCount?: number;
  buffer?: {
    before: number;
    after: number;
  };
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSelectDate?: (date: Date) => void;
};

type Column = {
  id: string;
  start: Date;
  isToday: boolean;
  topLabel: string;
  bottomLabel: string;
};

export const CalendarTaskView = ({
  anchorDate,
  selectedDate,
  dayColumnWidth,
  rowCount = C.TIMELINE_DEFAULT_ROW_COUNT,
  buffer = { before: 7, after: 14 },
  scrollContainerRef,
  onScroll,
  onSelectDate,
}: CalendarTaskViewProps) => {
  const columns: Column[] = useMemo(() => {
    const base = startOfDay(anchorDate);
    const today = new Date();

    const result: Column[] = [];

    for (let i = -buffer.before; i <= buffer.after; i++) {
      const date = addDays(base, i);

      result.push({
        id: date.toISOString(),
        start: date,
        isToday: date.toDateString() === today.toDateString(),
        topLabel: format(date, "d", { locale: ja }),
        bottomLabel: format(date, "E", { locale: ja }),
      });
    }

    return result;
  }, [anchorDate, buffer.before, buffer.after]);

  const columnWidth = dayColumnWidth;
  const gridWidth = columns.length * columnWidth;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col h-full overflow-hidden bg-white"
      style={{
        // ★ここが核心：Timelineのヘッダー分を吸収
        paddingTop: `${C.TIMELINE_HEADER_HEIGHT}px`,
      }}
    >
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
        onScroll={onScroll}
      >
        <div style={{ minWidth: `${gridWidth}px` }}>
          {/* ヘッダー（Task用・独立） */}
          <div className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, ${columnWidth}px)`,
                width: `${gridWidth}px`,
                height: `${C.TIMELINE_HEADER_HEIGHT}px`,
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

          {/* グリッド */}
          {Array.from({ length: rowCount }, (_, rowIndex) => (
            <Fragment key={rowIndex}>
              <div
                className="relative border-b border-[#e5e7eb] bg-white"
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
                      key={`${rowIndex}-${column.id}`}
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