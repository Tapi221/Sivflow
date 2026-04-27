import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  UIEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  buildCalendarMonthPages,
  getCalendarMonthKey,
  type CalendarMonthGridDay,
  type CalendarMonthPage,
} from "@/features/calendar/model/monthGrid";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const INITIAL_MONTH_BUFFER = 6;
const MONTH_EXTEND_COUNT = 6;
const MONTH_SCROLL_EDGE_THRESHOLD_PX = 560;
const MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX = 56;
const DEFAULT_MONTH_CELL_HEIGHT = 112;
const MIN_MONTH_CELL_HEIGHT = 72;
const MAX_MONTH_CELL_HEIGHT = 280;
const MONTH_CELL_RESIZE_HIT_AREA_PX = 8;
const MONTH_CELL_HEIGHT_STORAGE_KEY =
  "flashcard-master.calendar.monthCellHeight";

const createInitialMonthOffsetRange = () => ({
  startOffset: -INITIAL_MONTH_BUFFER,
  endOffset: INITIAL_MONTH_BUFFER,
});

const clampMonthCellHeight = (value: number) => {
  return Math.min(
    MAX_MONTH_CELL_HEIGHT,
    Math.max(MIN_MONTH_CELL_HEIGHT, Math.round(value)),
  );
};

const readStoredMonthCellHeight = () => {
  if (typeof window === "undefined") {
    return DEFAULT_MONTH_CELL_HEIGHT;
  }

  const rawValue = window.localStorage.getItem(MONTH_CELL_HEIGHT_STORAGE_KEY);
  const parsedValue = rawValue === null ? Number.NaN : Number(rawValue);

  return Number.isFinite(parsedValue)
    ? clampMonthCellHeight(parsedValue)
    : DEFAULT_MONTH_CELL_HEIGHT;
};

const writeStoredMonthCellHeight = (value: number) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MONTH_CELL_HEIGHT_STORAGE_KEY, String(value));
};

const getMonthAnnotation = (
  day: CalendarMonthGridDay,
  baseDate: Date,
): string | null => {
  if (day.isCurrentMonth || !day.isMonthStart) return null;

  const monthLabel = format(day.date, "M月", { locale: ja });
  const baseMonthLabel = format(baseDate, "M月", { locale: ja });

  return monthLabel === baseMonthLabel ? null : monthLabel;
};

type ExplorerCalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
};

type MonthCellResizeState = {
  startY: number;
  startHeight: number;
};

type MonthViewStyle = CSSProperties & {
  "--calendar-month-cell-height": string;
};

export const ExplorerCalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  onSelectDate,
  onVisibleMonthChange,
}: ExplorerCalendarMonthViewProps) => {
  const monthViewRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const monthSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prependScrollHeightRef = useRef<number | null>(null);
  const isExtendingBeforeRef = useRef(false);
  const isExtendingAfterRef = useRef(false);
  const pendingScrollMonthKeyRef = useRef<string | null>(
    getCalendarMonthKey(currentDate),
  );
  const lastScrollTargetTokenRef = useRef(scrollTargetToken);
  const visibleMonthKeyRef = useRef(getCalendarMonthKey(currentDate));
  const monthCellResizeStateRef = useRef<MonthCellResizeState | null>(null);
  const monthCellHeightRef = useRef(DEFAULT_MONTH_CELL_HEIGHT);
  const pendingMonthCellHeightRef = useRef(DEFAULT_MONTH_CELL_HEIGHT);
  const monthCellResizeFrameRef = useRef<number | null>(null);
  const suppressNextMonthCellClickRef = useRef(false);

  const [anchorMonth, setAnchorMonth] = useState(() => currentDate);
  const [monthOffsetRange, setMonthOffsetRange] = useState(
    createInitialMonthOffsetRange,
  );
  const [monthCellHeight, setMonthCellHeight] = useState(
    readStoredMonthCellHeight,
  );
  const today = useMemo(() => new Date(), []);

  const monthViewStyle: MonthViewStyle = {
    "--calendar-month-cell-height": `${monthCellHeight}px`,
  };

  const monthPages = useMemo(
    () =>
      buildCalendarMonthPages({
        anchorDate: anchorMonth,
        startOffset: monthOffsetRange.startOffset,
        endOffset: monthOffsetRange.endOffset,
      }),
    [anchorMonth, monthOffsetRange.endOffset, monthOffsetRange.startOffset],
  );

  const applyMonthCellHeightVariable = useCallback((nextHeight: number) => {
    monthViewRef.current?.style.setProperty(
      "--calendar-month-cell-height",
      `${nextHeight}px`,
    );
  }, []);

  const scheduleMonthCellHeightVariable = useCallback(
    (nextHeight: number) => {
      const clampedHeight = clampMonthCellHeight(nextHeight);
      pendingMonthCellHeightRef.current = clampedHeight;

      if (monthCellResizeFrameRef.current !== null) {
        return;
      }

      monthCellResizeFrameRef.current = window.requestAnimationFrame(() => {
        monthCellResizeFrameRef.current = null;
        applyMonthCellHeightVariable(pendingMonthCellHeightRef.current);
      });
    },
    [applyMonthCellHeightVariable],
  );

  const commitMonthCellHeight = useCallback(
    (nextHeight: number) => {
      const clampedHeight = clampMonthCellHeight(nextHeight);

      if (monthCellResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(monthCellResizeFrameRef.current);
        monthCellResizeFrameRef.current = null;
      }

      monthCellHeightRef.current = clampedHeight;
      pendingMonthCellHeightRef.current = clampedHeight;
      applyMonthCellHeightVariable(clampedHeight);
      writeStoredMonthCellHeight(clampedHeight);
      setMonthCellHeight(clampedHeight);
    },
    [applyMonthCellHeightVariable],
  );

  const setMonthSectionRef = useCallback(
    (monthKey: string, node: HTMLElement | null) => {
      if (node) {
        monthSectionRefs.current.set(monthKey, node);
        return;
      }

      monthSectionRefs.current.delete(monthKey);
    },
    [],
  );

  const syncVisibleMonthFromScroll = useCallback(
    (scroller: HTMLElement) => {
      if (!onVisibleMonthChange || monthPages.length === 0) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const sampleY = scrollerRect.top + MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;
      let closestPage: CalendarMonthPage | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const page of monthPages) {
        const section = monthSectionRefs.current.get(page.key);
        if (!section) continue;

        const rect = section.getBoundingClientRect();
        if (rect.top <= sampleY && rect.bottom > sampleY) {
          closestPage = page;
          break;
        }

        const distance = Math.min(
          Math.abs(rect.top - sampleY),
          Math.abs(rect.bottom - sampleY),
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = page;
        }
      }

      if (!closestPage || closestPage.key === visibleMonthKeyRef.current) {
        return;
      }

      visibleMonthKeyRef.current = closestPage.key;
      onVisibleMonthChange(closestPage.monthStart);
    },
    [monthPages, onVisibleMonthChange],
  );

  useEffect(() => {
    monthCellHeightRef.current = monthCellHeight;
    pendingMonthCellHeightRef.current = monthCellHeight;
    applyMonthCellHeightVariable(monthCellHeight);
  }, [applyMonthCellHeightVariable, monthCellHeight]);

  useEffect(() => {
    return () => {
      if (monthCellResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(monthCellResizeFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (lastScrollTargetTokenRef.current === scrollTargetToken) {
      return;
    }

    lastScrollTargetTokenRef.current = scrollTargetToken;

    const targetMonthKey = getCalendarMonthKey(currentDate);
    visibleMonthKeyRef.current = targetMonthKey;
    pendingScrollMonthKeyRef.current = targetMonthKey;
    prependScrollHeightRef.current = null;
    isExtendingBeforeRef.current = false;
    isExtendingAfterRef.current = false;

    setAnchorMonth(currentDate);
    setMonthOffsetRange(createInitialMonthOffsetRange());
  }, [currentDate, scrollTargetToken]);

  useLayoutEffect(() => {
    const targetMonthKey = pendingScrollMonthKeyRef.current;
    if (!targetMonthKey) return;

    const scroller = scrollContainerRef.current;
    const targetSection = monthSectionRefs.current.get(targetMonthKey);
    if (!scroller || !targetSection) return;

    scroller.scrollTop = targetSection.offsetTop;
    pendingScrollMonthKeyRef.current = null;
    syncVisibleMonthFromScroll(scroller);
  }, [monthPages, syncVisibleMonthFromScroll]);

  useLayoutEffect(() => {
    const previousScrollHeight = prependScrollHeightRef.current;
    if (previousScrollHeight === null) return;

    const scroller = scrollContainerRef.current;
    if (!scroller) {
      prependScrollHeightRef.current = null;
      isExtendingBeforeRef.current = false;
      return;
    }

    scroller.scrollTop += scroller.scrollHeight - previousScrollHeight;
    prependScrollHeightRef.current = null;
    isExtendingBeforeRef.current = false;
  }, [monthPages.length]);

  useEffect(() => {
    isExtendingAfterRef.current = false;
  }, [monthOffsetRange.endOffset]);

  const handleMonthScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget;

      if (
        scroller.scrollTop < MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingBeforeRef.current
      ) {
        isExtendingBeforeRef.current = true;
        prependScrollHeightRef.current = scroller.scrollHeight;
        setMonthOffsetRange((current) => ({
          ...current,
          startOffset: current.startOffset - MONTH_EXTEND_COUNT,
        }));
      }

      const distanceToBottom =
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;

      if (
        distanceToBottom < MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingAfterRef.current
      ) {
        isExtendingAfterRef.current = true;
        setMonthOffsetRange((current) => ({
          ...current,
          endOffset: current.endOffset + MONTH_EXTEND_COUNT,
        }));
      }

      syncVisibleMonthFromScroll(scroller);
    },
    [syncVisibleMonthFromScroll],
  );

  const handleMonthCellResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();

      if (rect.bottom - event.clientY > MONTH_CELL_RESIZE_HIT_AREA_PX) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const startHeight = monthCellHeightRef.current;
      monthCellResizeStateRef.current = {
        startY: event.clientY,
        startHeight,
      };
      pendingMonthCellHeightRef.current = startHeight;
      suppressNextMonthCellClickRef.current = true;

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const resizeState = monthCellResizeStateRef.current;

        if (!resizeState) {
          return;
        }

        scheduleMonthCellHeightVariable(
          resizeState.startHeight + moveEvent.clientY - resizeState.startY,
        );
      };

      const handlePointerUp = () => {
        commitMonthCellHeight(pendingMonthCellHeightRef.current);
        monthCellResizeStateRef.current = null;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        window.setTimeout(() => {
          suppressNextMonthCellClickRef.current = false;
        }, 120);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [commitMonthCellHeight, scheduleMonthCellHeightVariable],
  );

  const handleMonthCellDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();

      if (rect.bottom - event.clientY > MONTH_CELL_RESIZE_HIT_AREA_PX) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      suppressNextMonthCellClickRef.current = true;
      commitMonthCellHeight(DEFAULT_MONTH_CELL_HEIGHT);
      window.setTimeout(() => {
        suppressNextMonthCellClickRef.current = false;
      }, 120);
    },
    [commitMonthCellHeight],
  );

  const handleMonthCellClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, date: Date) => {
      if (suppressNextMonthCellClickRef.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextMonthCellClickRef.current = false;
        return;
      }

      onSelectDate(date);
    },
    [onSelectDate],
  );

  return (
    <div
      ref={monthViewRef}
      className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      style={monthViewStyle}
    >
      <div className="grid h-[48px] shrink-0 grid-cols-7 border-b border-[#ebeae4] bg-white">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex items-center justify-center border-r border-[#f0efea] text-[13px] font-semibold text-[#9b9a94] last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto bg-white"
        onScroll={handleMonthScroll}
      >
        {monthPages.map((monthPage) => (
          <section
            key={monthPage.key}
            ref={(node) => setMonthSectionRef(monthPage.key, node)}
            aria-label={monthPage.label}
            data-calendar-month-key={monthPage.key}
            className="border-b border-[#e6e4dc] bg-white"
          >
            <div className="grid grid-cols-7 bg-white">
              {monthPage.days.map((day, index) => {
                const selected = isSameDay(day.date, selectedDate);
                const todayCell = isSameDay(day.date, today);
                const monthAnnotation = getMonthAnnotation(
                  day,
                  monthPage.monthStart,
                );
                const isLastColumn = index % 7 === 6;

                return (
                  <button
                    key={`${monthPage.key}:${day.key}`}
                    type="button"
                    aria-label={format(day.date, "yyyy年M月d日", {
                      locale: ja,
                    })}
                    aria-pressed={selected}
                    className={cn(
                      "calendar-month-day-cell group relative overflow-hidden border-[#ebeae4] bg-white text-left outline-none transition-colors",
                      !isLastColumn && "border-r",
                      index < monthPage.days.length - 7 && "border-b",
                      selected && "bg-[#fff9f8]",
                      !selected && "hover:bg-[#fbfaf7]",
                      "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    )}
                    onClick={(event) => handleMonthCellClick(event, day.date)}
                    onDoubleClick={handleMonthCellDoubleClick}
                    onPointerDown={handleMonthCellResizePointerDown}
                  >
                    <span
                      className={cn(
                        "absolute left-4 top-4 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[15px] font-semibold tabular-nums transition-colors",
                        selected
                          ? "bg-[#ef5555] text-white shadow-[0_7px_18px_rgba(239,85,85,0.24)]"
                          : todayCell
                            ? "bg-[#f0efea] text-[#24231f]"
                            : day.isCurrentMonth
                              ? "text-[#24231f]"
                              : "text-[#b0aea8]",
                      )}
                    >
                      {day.dayOfMonth}
                    </span>

                    {monthAnnotation ? (
                      <span className="absolute right-4 top-[18px] text-[12px] font-semibold text-[#a09f98]">
                        {monthAnnotation}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
