import { format, isSameDay } from "date-fns";
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

import {
  buildCalendarMonthPages,
  getCalendarMonthKey,
  type CalendarMonthPage,
} from "@/features/calendar/model/monthGrid";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const INITIAL_MONTH_BUFFER = 6;
const MONTH_EXTEND_COUNT = 6;
const MONTH_SCROLL_EDGE_THRESHOLD_PX = 560;
const MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX = 56;

const createInitialMonthOffsetRange = () => ({
  startOffset: -INITIAL_MONTH_BUFFER,
  endOffset: INITIAL_MONTH_BUFFER,
});

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

  const [anchorMonth, setAnchorMonth] = useState(() => currentDate);
  const [monthOffsetRange, setMonthOffsetRange] = useState(
    createInitialMonthOffsetRange,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
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
                const isLastColumn = index % 7 === 6;
                const hasBottomBorder = index < monthPage.days.length - 7;
                const cellFrameClassName = cn(
                  "relative min-h-[112px] overflow-hidden border-[#ebeae4] bg-white text-left outline-none transition-colors",
                  !isLastColumn && "border-r",
                  hasBottomBorder && "border-b",
                );

                if (!day.isCurrentMonth) {
                  return (
                    <div
                      key={`${monthPage.key}:${day.key}`}
                      aria-hidden="true"
                      className={cellFrameClassName}
                    />
                  );
                }

                const selected = isSameDay(day.date, selectedDate);
                const todayCell = isSameDay(day.date, today);

                return (
                  <button
                    key={`${monthPage.key}:${day.key}`}
                    type="button"
                    aria-label={format(day.date, "yyyy年M月d日", {
                      locale: ja,
                    })}
                    aria-pressed={selected}
                    className={cn(
                      cellFrameClassName,
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
                            : "text-[#24231f]",
                      )}
                    >
                      {day.dayOfMonth}
                    </span>
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
