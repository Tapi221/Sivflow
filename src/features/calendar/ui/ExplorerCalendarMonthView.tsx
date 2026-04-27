import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import type {
  CSSProperties,
  KeyboardEvent,
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
  buildCalendarMonthWeeks,
  getCalendarMonthKey,
  getCalendarWeekKey,
  type CalendarMonthWeek,
} from "@/features/calendar/model/monthGrid";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAY_HEADER_HEIGHT_PX = 48;
const INITIAL_MONTH_BUFFER = 2;
const MONTH_EXTEND_COUNT = 4;
const MONTH_SCROLL_EDGE_THRESHOLD_PX = 560;
const MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX = 56;
const DEFAULT_MONTH_ROW_HEIGHT = 112;
const MIN_MONTH_ROW_HEIGHT = 72;
const MAX_MONTH_ROW_HEIGHT = 260;
const MONTH_ROW_HEIGHT_STEP = 4;
const MONTH_ROW_HEIGHT_STORAGE_KEY =
  "flashcard-master.calendar.monthRowHeight";

const createInitialMonthOffsetRange = () => ({
  startOffset: -INITIAL_MONTH_BUFFER,
  endOffset: INITIAL_MONTH_BUFFER,
});

const clampMonthRowHeight = (value: number) => {
  return Math.min(MAX_MONTH_ROW_HEIGHT, Math.max(MIN_MONTH_ROW_HEIGHT, value));
};

const normalizeStoredMonthRowHeight = (value: number) => {
  return Math.round(value);
};

const readStoredMonthRowHeight = () => {
  if (typeof window === "undefined") {
    return DEFAULT_MONTH_ROW_HEIGHT;
  }

  const rawValue = window.localStorage.getItem(MONTH_ROW_HEIGHT_STORAGE_KEY);
  const parsedValue = rawValue === null ? Number.NaN : Number(rawValue);

  return Number.isFinite(parsedValue)
    ? normalizeStoredMonthRowHeight(clampMonthRowHeight(parsedValue))
    : DEFAULT_MONTH_ROW_HEIGHT;
};

const writeStoredMonthRowHeight = (value: number) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    MONTH_ROW_HEIGHT_STORAGE_KEY,
    String(normalizeStoredMonthRowHeight(value)),
  );
};

const getMonthAnnotation = (date: Date): string | null => {
  if (date.getDate() !== 1) return null;
  return format(date, "M月", { locale: ja });
};

type MonthRowResizeAnchor = {
  weekKey: string;
  offsetTop: number;
};

type MonthRowResizeState = {
  startY: number;
  startHeight: number;
  anchor: MonthRowResizeAnchor | null;
};

type MonthViewStyle = CSSProperties & {
  "--calendar-month-row-height": string;
};

type ExplorerCalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
};

export const ExplorerCalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  onSelectDate,
  onVisibleMonthChange,
}: ExplorerCalendarMonthViewProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const weekRowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prependScrollHeightRef = useRef<number | null>(null);
  const isExtendingBeforeRef = useRef(false);
  const isExtendingAfterRef = useRef(false);
  const pendingScrollWeekKeyRef = useRef<string | null>(
    getCalendarWeekKey(currentDate),
  );
  const lastScrollTargetTokenRef = useRef(scrollTargetToken);
  const visibleMonthKeyRef = useRef(getCalendarMonthKey(currentDate));
  const monthRowResizeStateRef = useRef<MonthRowResizeState | null>(null);
  const monthRowHeightRef = useRef(DEFAULT_MONTH_ROW_HEIGHT);
  const pendingMonthRowHeightRef = useRef(DEFAULT_MONTH_ROW_HEIGHT);
  const monthRowResizeFrameRef = useRef<number | null>(null);

  const [anchorMonth, setAnchorMonth] = useState(() => currentDate);
  const [monthOffsetRange, setMonthOffsetRange] = useState(
    createInitialMonthOffsetRange,
  );
  const [monthRowHeight, setMonthRowHeight] = useState(
    readStoredMonthRowHeight,
  );
  const today = useMemo(() => new Date(), []);

  const monthWeeks = useMemo(
    () =>
      buildCalendarMonthWeeks({
        anchorDate: anchorMonth,
        startOffset: monthOffsetRange.startOffset,
        endOffset: monthOffsetRange.endOffset,
      }),
    [anchorMonth, monthOffsetRange.endOffset, monthOffsetRange.startOffset],
  );
  const monthViewStyle: MonthViewStyle = {
    "--calendar-month-row-height": `${monthRowHeight}px`,
  };

  const setWeekRowRef = useCallback((weekKey: string, node: HTMLElement | null) => {
    if (node) {
      weekRowRefs.current.set(weekKey, node);
      return;
    }

    weekRowRefs.current.delete(weekKey);
  }, []);

  const getMonthResizeAnchor = useCallback(
    (scroller: HTMLElement): MonthRowResizeAnchor | null => {
      if (monthWeeks.length === 0) return null;

      const scrollerRect = scroller.getBoundingClientRect();
      const sampleY = scrollerRect.top + MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;
      let closestWeek: CalendarMonthWeek | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const week of monthWeeks) {
        const row = weekRowRefs.current.get(week.key);
        if (!row) continue;

        const rect = row.getBoundingClientRect();
        if (rect.top <= sampleY && rect.bottom > sampleY) {
          closestWeek = week;
          break;
        }

        const distance = Math.min(
          Math.abs(rect.top - sampleY),
          Math.abs(rect.bottom - sampleY),
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestWeek = week;
        }
      }

      if (!closestWeek) return null;

      const row = weekRowRefs.current.get(closestWeek.key);
      if (!row) return null;

      return {
        weekKey: closestWeek.key,
        offsetTop: row.getBoundingClientRect().top - scrollerRect.top,
      };
    },
    [monthWeeks],
  );

  const preserveMonthResizeAnchor = useCallback(
    (anchor: MonthRowResizeAnchor | null) => {
      if (!anchor) return;

      const scroller = scrollContainerRef.current;
      const row = weekRowRefs.current.get(anchor.weekKey);
      if (!scroller || !row) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const nextOffsetTop = row.getBoundingClientRect().top - scrollerRect.top;
      scroller.scrollTop += nextOffsetTop - anchor.offsetTop;
    },
    [],
  );

  const getMonthResizeAnchorFromElement = useCallback(
    (element: HTMLElement): MonthRowResizeAnchor | null => {
      const scroller = scrollContainerRef.current;
      const row = element.closest("[data-calendar-week-key]") as HTMLElement | null;
      const weekKey = row?.dataset.calendarWeekKey;

      if (!scroller || !row || !weekKey) {
        return null;
      }

      const scrollerRect = scroller.getBoundingClientRect();

      return {
        weekKey,
        offsetTop: row.getBoundingClientRect().top - scrollerRect.top,
      };
    },
    [],
  );

  const syncVisibleMonthFromScroll = useCallback(
    (scroller: HTMLElement) => {
      if (!onVisibleMonthChange || monthWeeks.length === 0) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const sampleY = scrollerRect.top + MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;
      let closestWeek: CalendarMonthWeek | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const week of monthWeeks) {
        const row = weekRowRefs.current.get(week.key);
        if (!row) continue;

        const rect = row.getBoundingClientRect();
        if (rect.top <= sampleY && rect.bottom > sampleY) {
          closestWeek = week;
          break;
        }

        const distance = Math.min(
          Math.abs(rect.top - sampleY),
          Math.abs(rect.bottom - sampleY),
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestWeek = week;
        }
      }

      if (!closestWeek) return;

      const nextMonthKey = getCalendarMonthKey(closestWeek.visibleMonthDate);
      if (nextMonthKey === visibleMonthKeyRef.current) return;

      visibleMonthKeyRef.current = nextMonthKey;
      onVisibleMonthChange(closestWeek.visibleMonthDate);
    },
    [monthWeeks, onVisibleMonthChange],
  );

  const applyMonthRowHeightVariable = useCallback(
    (nextHeight: number, anchor: MonthRowResizeAnchor | null = null) => {
      rootRef.current?.style.setProperty(
        "--calendar-month-row-height",
        `${nextHeight}px`,
      );
      preserveMonthResizeAnchor(anchor);
    },
    [preserveMonthResizeAnchor],
  );

  const scheduleMonthRowHeightVariable = useCallback(
    (nextHeight: number) => {
      const clampedHeight = clampMonthRowHeight(nextHeight);
      pendingMonthRowHeightRef.current = clampedHeight;

      if (monthRowResizeFrameRef.current !== null) {
        return;
      }

      monthRowResizeFrameRef.current = window.requestAnimationFrame(() => {
        monthRowResizeFrameRef.current = null;
        applyMonthRowHeightVariable(
          pendingMonthRowHeightRef.current,
          monthRowResizeStateRef.current?.anchor ?? null,
        );
      });
    },
    [applyMonthRowHeightVariable],
  );

  const commitMonthRowHeight = useCallback(
    (nextHeight: number, anchor?: MonthRowResizeAnchor | null) => {
      const clampedHeight = clampMonthRowHeight(nextHeight);
      const committedHeight = normalizeStoredMonthRowHeight(clampedHeight);
      const scrollAnchor =
        anchor === undefined && scrollContainerRef.current
          ? getMonthResizeAnchor(scrollContainerRef.current)
          : (anchor ?? null);

      if (monthRowResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(monthRowResizeFrameRef.current);
        monthRowResizeFrameRef.current = null;
      }

      monthRowHeightRef.current = committedHeight;
      pendingMonthRowHeightRef.current = committedHeight;
      applyMonthRowHeightVariable(committedHeight, scrollAnchor);
      writeStoredMonthRowHeight(committedHeight);
      setMonthRowHeight(committedHeight);

      const scroller = scrollContainerRef.current;
      if (scroller) {
        window.requestAnimationFrame(() => syncVisibleMonthFromScroll(scroller));
      }
    },
    [applyMonthRowHeightVariable, getMonthResizeAnchor, syncVisibleMonthFromScroll],
  );

  useEffect(() => {
    monthRowHeightRef.current = monthRowHeight;
    pendingMonthRowHeightRef.current = monthRowHeight;
    applyMonthRowHeightVariable(monthRowHeight);
  }, [applyMonthRowHeightVariable, monthRowHeight]);

  useEffect(() => {
    return () => {
      if (monthRowResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(monthRowResizeFrameRef.current);
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
    pendingScrollWeekKeyRef.current = getCalendarWeekKey(currentDate);
    prependScrollHeightRef.current = null;
    isExtendingBeforeRef.current = false;
    isExtendingAfterRef.current = false;

    setAnchorMonth(currentDate);
    setMonthOffsetRange(createInitialMonthOffsetRange());
  }, [currentDate, scrollTargetToken]);

  useLayoutEffect(() => {
    const targetWeekKey = pendingScrollWeekKeyRef.current;
    if (!targetWeekKey) return;

    const scroller = scrollContainerRef.current;
    const targetRow = weekRowRefs.current.get(targetWeekKey);
    if (!scroller || !targetRow) return;

    scroller.scrollTop = Math.max(
      0,
      targetRow.offsetTop - WEEKDAY_HEADER_HEIGHT_PX,
    );
    pendingScrollWeekKeyRef.current = null;
    syncVisibleMonthFromScroll(scroller);
  }, [monthWeeks, syncVisibleMonthFromScroll]);

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
  }, [monthWeeks.length]);

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

  const handleMonthRowResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const startHeight = monthRowHeightRef.current;
      monthRowResizeStateRef.current = {
        startY: event.clientY,
        startHeight,
        anchor: getMonthResizeAnchorFromElement(event.currentTarget),
      };
      pendingMonthRowHeightRef.current = startHeight;

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const resizeState = monthRowResizeStateRef.current;

        if (!resizeState) {
          return;
        }

        scheduleMonthRowHeightVariable(
          resizeState.startHeight + moveEvent.clientY - resizeState.startY,
        );
      };

      const handlePointerUp = () => {
        const resizeState = monthRowResizeStateRef.current;
        commitMonthRowHeight(
          pendingMonthRowHeightRef.current,
          resizeState?.anchor ?? null,
        );
        monthRowResizeStateRef.current = null;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [
      commitMonthRowHeight,
      getMonthResizeAnchorFromElement,
      scheduleMonthRowHeightVariable,
    ],
  );

  const handleMonthRowResizeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      commitMonthRowHeight(monthRowHeightRef.current - MONTH_ROW_HEIGHT_STEP);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      commitMonthRowHeight(monthRowHeightRef.current + MONTH_ROW_HEIGHT_STEP);
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      commitMonthRowHeight(
        monthRowHeightRef.current - MONTH_ROW_HEIGHT_STEP * 4,
      );
      return;
    }

    if (event.key === "PageDown") {
      event.preventDefault();
      commitMonthRowHeight(
        monthRowHeightRef.current + MONTH_ROW_HEIGHT_STEP * 4,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      commitMonthRowHeight(MIN_MONTH_ROW_HEIGHT);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      commitMonthRowHeight(MAX_MONTH_ROW_HEIGHT);
    }
  };

  const handleMonthRowResizeReset = () => {
    commitMonthRowHeight(DEFAULT_MONTH_ROW_HEIGHT);
  };

  return (
    <div
      ref={rootRef}
      className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      style={monthViewStyle}
    >
      <div
        ref={scrollContainerRef}
        className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white"
        onScroll={handleMonthScroll}
      >
        <div className="sticky top-0 z-20 grid h-[48px] grid-cols-7 border-b border-[#ebeae4] bg-white">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="flex items-center justify-center border-r border-[#f0efea] text-[13px] font-semibold text-[#9b9a94] last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="bg-white">
          {monthWeeks.map((week) => (
            <div
              key={week.key}
              ref={(node) => setWeekRowRef(week.key, node)}
              data-calendar-week-key={week.key}
              className="grid grid-cols-7 bg-white"
            >
              {week.days.map((day, index) => {
                const selected = isSameDay(day.date, selectedDate);
                const todayCell = isSameDay(day.date, today);
                const monthAnnotation = getMonthAnnotation(day.date);
                const isLastColumn = index % 7 === 6;

                return (
                  <button
                    key={day.key}
                    type="button"
                    aria-label={format(day.date, "yyyy年M月d日", {
                      locale: ja,
                    })}
                    aria-pressed={selected}
                    className={cn(
                      "calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-hidden border-b border-[#ebeae4] bg-white text-left outline-none transition-colors",
                      !isLastColumn && "border-r",
                      selected && "bg-[#fff9f8]",
                      !selected && "hover:bg-[#fbfaf7]",
                      "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    )}
                    onClick={() => onSelectDate(day.date)}
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

                    <div
                      role="separator"
                      aria-label="月表示の日付セルの高さを調整"
                      aria-orientation="horizontal"
                      aria-valuemin={MIN_MONTH_ROW_HEIGHT}
                      aria-valuemax={MAX_MONTH_ROW_HEIGHT}
                      aria-valuenow={monthRowHeight}
                      tabIndex={0}
                      className="calendar-month-row-boundary-resize-handle absolute inset-x-0 bottom-[-4px] z-30 h-2 cursor-row-resize"
                      title="ドラッグで月表示の縦幅を変更。ダブルクリックで初期値に戻します。"
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={handleMonthRowResizeReset}
                      onKeyDown={handleMonthRowResizeKeyDown}
                      onPointerDown={handleMonthRowResizePointerDown}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
