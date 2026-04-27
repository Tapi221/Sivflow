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
  return Math.min(
    MAX_MONTH_ROW_HEIGHT,
    Math.max(MIN_MONTH_ROW_HEIGHT, Math.round(value)),
  );
};

const readStoredMonthRowHeight = () => {
  if (typeof window === "undefined") {
    return DEFAULT_MONTH_ROW_HEIGHT;
  }

  const rawValue = window.localStorage.getItem(MONTH_ROW_HEIGHT_STORAGE_KEY);
  const parsedValue = rawValue === null ? Number.NaN : Number(rawValue);

  return Number.isFinite(parsedValue)
    ? clampMonthRowHeight(parsedValue)
    : DEFAULT_MONTH_ROW_HEIGHT;
};

const writeStoredMonthRowHeight = (value: number) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MONTH_ROW_HEIGHT_STORAGE_KEY, String(value));
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

type MonthRowResizeAnchor = {
  monthKey: string;
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
  const monthSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prependScrollHeightRef = useRef<number | null>(null);
  const isExtendingBeforeRef = useRef(false);
  const isExtendingAfterRef = useRef(false);
  const pendingScrollMonthKeyRef = useRef<string | null>(
    getCalendarMonthKey(currentDate),
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

  const monthPages = useMemo(
    () =>
      buildCalendarMonthPages({
        anchorDate: anchorMonth,
        startOffset: monthOffsetRange.startOffset,
        endOffset: monthOffsetRange.endOffset,
      }),
    [anchorMonth, monthOffsetRange.endOffset, monthOffsetRange.startOffset],
  );
  const monthViewStyle: MonthViewStyle = {
    "--calendar-month-row-height": `${monthRowHeight}px`,
  };

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

  const getMonthResizeAnchor = useCallback(
    (scroller: HTMLElement): MonthRowResizeAnchor | null => {
      if (monthPages.length === 0) return null;

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

      if (!closestPage) return null;

      const section = monthSectionRefs.current.get(closestPage.key);
      if (!section) return null;

      return {
        monthKey: closestPage.key,
        offsetTop: section.getBoundingClientRect().top - scrollerRect.top,
      };
    },
    [monthPages],
  );

  const preserveMonthResizeAnchor = useCallback(
    (anchor: MonthRowResizeAnchor | null) => {
      if (!anchor) return;

      const scroller = scrollContainerRef.current;
      const section = monthSectionRefs.current.get(anchor.monthKey);
      if (!scroller || !section) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const nextOffsetTop = section.getBoundingClientRect().top - scrollerRect.top;
      scroller.scrollTop += nextOffsetTop - anchor.offsetTop;
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
      const scrollAnchor =
        anchor === undefined && scrollContainerRef.current
          ? getMonthResizeAnchor(scrollContainerRef.current)
          : (anchor ?? null);

      if (monthRowResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(monthRowResizeFrameRef.current);
        monthRowResizeFrameRef.current = null;
      }

      monthRowHeightRef.current = clampedHeight;
      pendingMonthRowHeightRef.current = clampedHeight;
      applyMonthRowHeightVariable(clampedHeight, scrollAnchor);
      writeStoredMonthRowHeight(clampedHeight);
      setMonthRowHeight(clampedHeight);

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

  const handleMonthRowResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const scroller = scrollContainerRef.current;
      const startHeight = monthRowHeightRef.current;
      monthRowResizeStateRef.current = {
        startY: event.clientY,
        startHeight,
        anchor: scroller ? getMonthResizeAnchor(scroller) : null,
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
      getMonthResizeAnchor,
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
        className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white"
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
                      className="calendar-month-row-boundary-resize-handle"
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
          </section>
        ))}
      </div>
    </div>
  );
};
