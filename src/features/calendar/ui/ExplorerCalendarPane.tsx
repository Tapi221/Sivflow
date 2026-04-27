import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  isSameDay,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { UIEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "@/ui/icons";

type ExplorerCalendarPaneProps = {
  onClose?: () => void;
};

type CalendarViewMode = "month" | "week" | "days";

type CalendarDemoEvent = {
  id: string;
  title: string;
  startsAt: Date;
  minutes: number;
};

type TimelineBufferDays = {
  before: number;
  after: number;
};

const DEFAULT_RANGE_DAYS = 3;
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const WEEK_STARTS_ON_MONDAY = 1;
const TIME_COLUMN_WIDTH = 74;
const DAY_COLUMN_MIN_WIDTH = 136;
const MONTH_NAVIGATION_STEP = 1;
const INITIAL_TIMELINE_BUFFER_DAYS = 28;
const TIMELINE_EXTEND_DAYS = 28;
const TIMELINE_EDGE_THRESHOLD_PX = 320;

const VIEW_MODE_OPTIONS = [
  { value: "month", label: "月" },
  { value: "week", label: "週" },
  { value: "days", label: "日数" },
] satisfies Array<{ value: CalendarViewMode; label: string }>;

const createInitialTimelineBuffer = (): TimelineBufferDays => ({
  before: INITIAL_TIMELINE_BUFFER_DAYS,
  after: INITIAL_TIMELINE_BUFFER_DAYS,
});

const getRangeDayCount = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  rangeDays: number,
) => {
  if (viewMode === "month") {
    return getDaysInMonth(baseDate);
  }

  return viewMode === "week" ? 7 : rangeDays;
};

const getViewportDayCount = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  rangeDays: number,
) => {
  if (viewMode === "month") {
    return 7;
  }

  return getRangeDayCount(baseDate, viewMode, rangeDays);
};

const createVisibleDays = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  rangeDays: number,
  timelineBuffer: TimelineBufferDays,
) => {
  const normalizedDate = startOfDay(baseDate);
  const startDate =
    viewMode === "month"
      ? startOfMonth(normalizedDate)
      : viewMode === "week"
        ? startOfWeek(normalizedDate, { weekStartsOn: WEEK_STARTS_ON_MONDAY })
        : normalizedDate;
  const visibleDayCount = getRangeDayCount(normalizedDate, viewMode, rangeDays);
  const timelineStartDate = subDays(startDate, timelineBuffer.before);
  const timelineDayCount =
    timelineBuffer.before + visibleDayCount + timelineBuffer.after;

  return Array.from({ length: timelineDayCount }, (_, index) =>
    addDays(timelineStartDate, index),
  );
};

const createHourLabel = (hour: number) => {
  return `${String(hour).padStart(2, "0")}:00`;
};

const createDemoEvents = (baseDate: Date): CalendarDemoEvent[] => {
  const selectedDate = startOfDay(baseDate);
  const nextDate = addDays(selectedDate, 1);

  return [
    {
      id: "review-core",
      title: "復習キュー",
      startsAt: setMinutes(setHours(selectedDate, 9), 0),
      minutes: 45,
    },
    {
      id: "deck-maintenance",
      title: "カード整理",
      startsAt: setMinutes(setHours(selectedDate, 14), 30),
      minutes: 60,
    },
    {
      id: "next-preview",
      title: "次回確認",
      startsAt: setMinutes(setHours(nextDate, 11), 0),
      minutes: 30,
    },
  ];
};

const calculateEventStyle = (event: CalendarDemoEvent) => {
  const startHour = event.startsAt.getHours() + event.startsAt.getMinutes() / 60;
  const top = Math.max(0, (startHour - HOURS[0]) * 88);
  const height = Math.max(36, (event.minutes / 60) * 88);

  return {
    top: `${top + 8}px`,
    height: `${height}px`,
  };
};

export const ExplorerCalendarPane = ({ onClose }: ExplorerCalendarPaneProps) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prependScrollCorrectionRef = useRef(0);
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);
  const shouldSyncScrollRef = useRef(true);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("days");
  const [rangeDays, setRangeDays] = useState(DEFAULT_RANGE_DAYS);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [timelineBuffer, setTimelineBuffer] = useState(
    createInitialTimelineBuffer,
  );

  const visibleDays = useMemo(
    () => createVisibleDays(currentDate, viewMode, rangeDays, timelineBuffer),
    [currentDate, rangeDays, timelineBuffer, viewMode],
  );
  const demoEvents = useMemo(() => createDemoEvents(currentDate), [currentDate]);

  const monthLabel = format(currentDate, "yyyy年 M月", { locale: ja });
  const viewportDayCount = getViewportDayCount(currentDate, viewMode, rangeDays);
  const dayColumnWidth =
    viewportWidth > TIME_COLUMN_WIDTH
      ? Math.max(
          1,
          (viewportWidth - TIME_COLUMN_WIDTH) / Math.max(1, viewportDayCount),
        )
      : DAY_COLUMN_MIN_WIDTH;
  const gridWidth = TIME_COLUMN_WIDTH + visibleDays.length * dayColumnWidth;
  const dayNavigationStep = viewMode === "week" ? 7 : rangeDays;

  const resetTimelinePosition = useCallback(() => {
    shouldSyncScrollRef.current = true;
    setTimelineBuffer(createInitialTimelineBuffer());
  }, []);

  const syncScrollToRangeStart = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || dayColumnWidth <= 0) {
      return;
    }

    scrollContainer.scrollLeft = timelineBuffer.before * dayColumnWidth;
  }, [dayColumnWidth, timelineBuffer.before]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return undefined;
    }

    const updateViewportWidth = () => {
      shouldSyncScrollRef.current = true;
      setViewportWidth(scrollContainer.clientWidth);
    };

    updateViewportWidth();

    const resizeObserver = new ResizeObserver(updateViewportWidth);
    resizeObserver.observe(scrollContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!shouldSyncScrollRef.current) {
      return;
    }

    syncScrollToRangeStart();
    shouldSyncScrollRef.current = false;
  }, [currentDate, rangeDays, syncScrollToRangeStart, viewMode, viewportWidth]);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const correction = prependScrollCorrectionRef.current;

    if (!scrollContainer || correction <= 0) {
      isExtendingLeftRef.current = false;
      return;
    }

    scrollContainer.scrollLeft += correction;
    prependScrollCorrectionRef.current = 0;
    isExtendingLeftRef.current = false;
  }, [dayColumnWidth, timelineBuffer.before]);

  useEffect(() => {
    isExtendingRightRef.current = false;
  }, [timelineBuffer.after]);

  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;

      if (dayColumnWidth <= 0) {
        return;
      }

      if (
        target.scrollLeft < TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;
        prependScrollCorrectionRef.current +=
          TIMELINE_EXTEND_DAYS * dayColumnWidth;
        setTimelineBuffer((prev) => ({
          ...prev,
          before: prev.before + TIMELINE_EXTEND_DAYS,
        }));
      }

      const distanceToRightEdge =
        target.scrollWidth - target.clientWidth - target.scrollLeft;

      if (
        distanceToRightEdge < TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;
        setTimelineBuffer((prev) => ({
          ...prev,
          after: prev.after + TIMELINE_EXTEND_DAYS,
        }));
      }
    },
    [dayColumnWidth],
  );

  const handleViewModeChange = (nextViewMode: CalendarViewMode) => {
    resetTimelinePosition();
    setViewMode(nextViewMode);
  };

  const handleRangeDaysToggle = () => {
    resetTimelinePosition();
    setRangeDays((prev) => (prev === 3 ? 7 : 3));
  };

  const handleToday = () => {
    resetTimelinePosition();
    setCurrentDate(new Date());
  };

  const handlePrevious = () => {
    resetTimelinePosition();
    setCurrentDate((prev) =>
      viewMode === "month"
        ? subMonths(prev, MONTH_NAVIGATION_STEP)
        : subDays(prev, dayNavigationStep),
    );
  };

  const handleNext = () => {
    resetTimelinePosition();
    setCurrentDate((prev) =>
      viewMode === "month"
        ? addMonths(prev, MONTH_NAVIGATION_STEP)
        : addDays(prev, dayNavigationStep),
    );
  };

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#fbfbfa] text-[#24231f]">
      <header className="flex h-[84px] shrink-0 items-center gap-4 border-b border-[#dddcd5] bg-[rgba(255,255,255,0.96)] px-5 shadow-[0_1px_0_rgba(255,255,255,0.72)_inset]">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-semibold tracking-[-0.035em] text-[#24231f]">
              {monthLabel}
            </h1>
          </div>

          <div className="hidden h-10 items-center rounded-[10px] border border-[#dddcd5] bg-[#f1f0ec] p-1 shadow-[inset_0_1px_2px_rgba(86,72,74,0.08)] md:flex">
            {VIEW_MODE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "h-8 rounded-[8px] px-4 text-[13px] font-medium transition-colors",
                  viewMode === item.value
                    ? "bg-white text-[#24231f] shadow-[0_1px_4px_rgba(15,23,42,0.12)]"
                    : "text-[#777671] hover:text-[#33322f]",
                )}
                onClick={() => handleViewModeChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {viewMode === "days" ? (
            <button
              type="button"
              className="hidden h-10 items-center overflow-hidden rounded-[10px] border border-[#dddcd5] bg-[#f6f6f4] text-[13px] font-semibold text-[#33322f] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] transition-colors hover:bg-white md:flex"
              onClick={handleRangeDaysToggle}
            >
              <span className="px-4 tabular-nums">{rangeDays}</span>
              <span className="h-full border-l border-[#dddcd5] px-3 leading-10 text-[#777671]">
                日
              </span>
            </button>
          ) : null}
        </div>

        <div className="flex h-10 shrink-0 items-center rounded-[10px] border border-[#dddcd5] bg-[#f6f6f4] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#777671] transition-colors hover:bg-white hover:text-[#24231f]"
            aria-label="前へ"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="h-8 rounded-[8px] px-4 text-[13px] font-semibold text-[#33322f] transition-colors hover:bg-white"
            onClick={handleToday}
          >
            今日
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#777671] transition-colors hover:bg-white hover:text-[#24231f]"
            aria-label="次へ"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {onClose ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#dddcd5] bg-[#f6f6f4] text-[#777671] transition-colors hover:bg-white hover:text-[#24231f]"
            aria-label="カレンダーを閉じる"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <div
        ref={scrollContainerRef}
        className="calendar-timeline-scroll min-h-0 flex-1 overflow-auto bg-white"
        onScroll={handleTimelineScroll}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, ${dayColumnWidth}px)`,
            minWidth: `${gridWidth}px`,
          }}
        >
          <div className="sticky left-0 top-0 z-30 border-b border-r border-[#e8e7e1] bg-white" />

          {visibleDays.map((day) => {
            const selected = isSameDay(day, currentDate);
            const today = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "sticky top-0 z-20 flex h-[56px] items-center justify-center gap-2 border-b border-r border-[#e8e7e1] bg-white text-[13px]",
                  selected && "bg-[#fff8f8]",
                )}
              >
                <span className="font-semibold text-[#9b9a94]">
                  {WEEKDAY_LABELS[day.getDay()]}
                </span>
                <span
                  className={cn(
                    "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-bold tabular-nums",
                    selected
                      ? "bg-[#ef5555] text-white shadow-[0_5px_14px_rgba(239,85,85,0.28)]"
                      : today
                        ? "bg-[#f0efea] text-[#24231f]"
                        : "text-[#33322f]",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}

          <div className="sticky left-0 z-10 flex h-[46px] items-center justify-center border-b border-r border-[#e8e7e1] bg-white text-[12px] font-semibold text-[#9b9a94]">
            終日
          </div>

          {visibleDays.map((day) => (
            <div
              key={`allday-${day.toISOString()}`}
              className={cn(
                "h-[46px] border-b border-r border-[#e8e7e1]",
                isSameDay(day, currentDate) && "bg-[#fff8f8]",
              )}
            />
          ))}

          <div className="sticky left-0 z-10 bg-white">
            {HOURS.map((hour) => (
              <div
                key={`hour-label-${hour}`}
                className="flex h-[88px] justify-center border-b border-r border-[#e8e7e1] pt-2 text-[12px] text-[#8b8a84]"
              >
                {createHourLabel(hour)}
              </div>
            ))}
          </div>

          {visibleDays.map((day) => {
            const events = demoEvents.filter((event) =>
              isSameDay(event.startsAt, day),
            );

            return (
              <div
                key={`day-body-${day.toISOString()}`}
                className={cn(
                  "relative border-r border-[#e8e7e1]",
                  isSameDay(day, currentDate) && "bg-[#fff8f8]",
                )}
              >
                {HOURS.map((hour) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="h-[88px] border-b border-[#e8e7e1]"
                  />
                ))}

                {events.map((event) => (
                  <article
                    key={event.id}
                    style={calculateEventStyle(event)}
                    className="absolute left-2 right-2 overflow-hidden rounded-[10px] border border-[#f2c4c0] bg-[#fff1f0] px-2.5 py-2 text-[#7f2d28] shadow-[0_8px_18px_rgba(127,45,40,0.08)]"
                  >
                    <div className="truncate text-[12px] font-bold leading-4">
                      {event.title}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium tabular-nums opacity-70">
                      {format(event.startsAt, "HH:mm")}
                    </div>
                  </article>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
