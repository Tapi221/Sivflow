import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { addDays, addYears, eachMonthOfInterval, endOfDay, endOfMonth, endOfYear, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { useDateFnsLocale, useT } from "@shared/i18n/useT";

type CalendarYearViewProps = {
  yearDate: Date;
  selectedDate: Date;
  visibleEvents?: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onRenderedRangeChange?: (range: CalendarDateRange) => void;
};

type CalendarYearDayEvents = {
  count: number;
  color: string;
};

type CalendarYearDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  events: CalendarYearDayEvents | null;
};

type CalendarYearMonth = {
  key: string;
  date: Date;
  label: string;
  weeks: CalendarYearDay[][];
};

type CalendarYearBlock = {
  key: string;
  date: Date;
  label: string;
  months: CalendarYearMonth[];
};

type YearRangeAnchor = {
  yearKey: string;
  offsetTop: number;
};

const YEAR_MONTH_GRID_DAY_COUNT = 42;
const INITIAL_YEAR_BUFFER = 5;
const YEAR_EXTEND_COUNT = 2;
const YEAR_MAX_RENDERED_YEARS = 11;
const YEAR_SCROLL_EDGE_THRESHOLD_PX = 2400;
const YEAR_RENDERED_RANGE_NOTIFY_DELAY_MS = 180;
const YEAR_RENDERED_RANGE_SAMPLE_OFFSET_PX = 160;
const YEAR_MONTH_ROW_OFFSET_TOLERANCE_PX = 2;
const EVENT_DAY_BACKGROUND_ALPHA = 0.16;

const createDayAriaLabel = (date: Date, eventCount: number): string => {
  const baseLabel = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

  if (eventCount <= 0) return baseLabel;

  return `${baseLabel}、予定${eventCount}件`;
};

const normalizeColor = (color: string): string => {
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const red = color.charAt(1);
    const green = color.charAt(2);
    const blue = color.charAt(3);

    return `#${red}${red}${green}${green}${blue}${blue}`;
  }

  return color;
};

const colorToRgba = (color: string, alpha: number): string => {
  const normalized = normalizeColor(color);
  const match = /^#([0-9a-f]{6})$/i.exec(normalized);

  if (!match) return color;

  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const buildEventsByDay = (events: GoogleCalendarEvent[]): Map<string, CalendarYearDayEvents> => {
  const eventsByDay = new Map<string, CalendarYearDayEvents>();

  for (const event of events) {
    for (const dayKey of getEventDateKeys(event)) {
      const current = eventsByDay.get(dayKey);

      if (current) {
        current.count += 1;
      } else {
        eventsByDay.set(dayKey, {
          count: 1,
          color: event.accentColor,
        });
      }
    }
  }

  return eventsByDay;
};

const buildMonthDays = (monthDate: Date, eventsByDay: Map<string, CalendarYearDayEvents>): CalendarYearDay[] => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });

  return Array.from({ length: YEAR_MONTH_GRID_DAY_COUNT }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = getCalendarDateKey(date);

    return {
      date,
      key,
      dayOfMonth: date.getDate(),
      isCurrentMonth: isSameMonth(date, monthStart),
      events: eventsByDay.get(key) ?? null,
    };
  });
};

const chunkMonthWeeks = (days: CalendarYearDay[]): CalendarYearDay[][] => {
  const weeks: CalendarYearDay[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
};

const buildMonthDateRange = (date: Date): CalendarDateRange => ({
  start: startOfMonth(date),
  end: endOfDay(endOfMonth(date)),
});

const buildMonthRowDateRange = (months: CalendarYearMonth[]): CalendarDateRange | null => {
  if (months.length === 0) return null;
  const sortedMonths = [...months].sort((left, right) => left.date.getTime() - right.date.getTime());
  const firstMonth = sortedMonths[0];
  const lastMonth = sortedMonths[sortedMonths.length - 1];

  return {
    start: startOfMonth(firstMonth.date),
    end: endOfDay(endOfMonth(lastMonth.date)),
  };
};

const isSameCalendarDateRange = (left: CalendarDateRange, right: CalendarDateRange): boolean => left.start.getTime() === right.start.getTime() && left.end.getTime() === right.end.getTime();

const getDayButtonStyle = (day: CalendarYearDay, selected: boolean): CSSProperties | undefined => {
  if (selected || !day.events) return undefined;

  return {
    backgroundColor: colorToRgba(day.events.color, EVENT_DAY_BACKGROUND_ALPHA),
    transition: "none",
  };
};

const CalendarYearViewComponent = ({
  yearDate,
  selectedDate,
  visibleEvents = [],
  onSelectDate,
  onRenderedRangeChange,
}: CalendarYearViewProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const today = useMemo(() => new Date(), []);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const yearSectionRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const monthSectionRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const rangeAnchorRef = useRef<YearRangeAnchor | null>(null);
  const isExtendingBeforeRef = useRef(false);
  const isExtendingAfterRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const renderedRangeNotifyTimeoutRef = useRef<number | null>(null);
  const requestedYearKeyRef = useRef(format(startOfYear(yearDate), "yyyy"));
  const pendingScrollYearKeyRef = useRef<string | null>(format(startOfYear(yearDate), "yyyy"));
  const [anchorYear, setAnchorYear] = useState(() => startOfYear(yearDate));
  const [yearOffsetRange, setYearOffsetRange] = useState(() => ({
    startOffset: -INITIAL_YEAR_BUFFER,
    endOffset: INITIAL_YEAR_BUFFER,
  }));
  const [renderedRange, setRenderedRange] = useState(() => buildMonthDateRange(yearDate));

  const eventsByDay = useMemo(() => buildEventsByDay(visibleEvents), [visibleEvents]);

  const buildYearMonths = useCallback(
    (targetYear: Date): CalendarYearMonth[] => {
      return eachMonthOfInterval({
        start: startOfYear(targetYear),
        end: endOfYear(targetYear),
      }).map((monthDate) => {
        const days = buildMonthDays(monthDate, eventsByDay);

        return {
          key: format(monthDate, "yyyy-MM"),
          date: monthDate,
          label: format(monthDate, t.dateFnsLocaleKey === "ja" ? "M月" : "MMM", { locale: dateFnsLocale }),
          weeks: chunkMonthWeeks(days),
        };
      });
    },
    [dateFnsLocale, eventsByDay, t.dateFnsLocaleKey],
  );

  const years = useMemo<CalendarYearBlock[]>(() => {
    const yearCount = Math.max(0, yearOffsetRange.endOffset - yearOffsetRange.startOffset + 1);

    return Array.from({ length: yearCount }, (_, index) => {
      const date = startOfYear(addYears(anchorYear, yearOffsetRange.startOffset + index));

      return {
        key: format(date, "yyyy"),
        date,
        label: format(date, "yyyy年", { locale: dateFnsLocale }),
        months: buildYearMonths(date),
      };
    });
  }, [anchorYear, buildYearMonths, dateFnsLocale, yearOffsetRange.endOffset, yearOffsetRange.startOffset]);

  const getRenderedRangeFromScroll = useCallback((scroller: HTMLDivElement): CalendarDateRange | null => {
    const sampleTop = scroller.scrollTop + Math.min(YEAR_RENDERED_RANGE_SAMPLE_OFFSET_PX, scroller.clientHeight / 2);
    let bestYear: CalendarYearBlock | null = null;
    let bestMonth: CalendarYearMonth | null = null;
    let bestSection: HTMLElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const year of years) {
      for (const month of year.months) {
        const section = monthSectionRefsMap.current.get(month.key);
        if (!section) continue;

        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        const distance = sampleTop < sectionTop ? sectionTop - sampleTop : sampleTop > sectionBottom ? sampleTop - sectionBottom : 0;

        if (distance < bestDistance) {
          bestDistance = distance;
          bestYear = year;
          bestMonth = month;
          bestSection = section;
        }
      }
    }

    if (!bestYear || !bestMonth || !bestSection) return null;

    const rowTop = bestSection.offsetTop;
    const rowMonths = bestYear.months.filter((month) => {
      const section = monthSectionRefsMap.current.get(month.key);
      return section ? Math.abs(section.offsetTop - rowTop) <= YEAR_MONTH_ROW_OFFSET_TOLERANCE_PX : false;
    });

    return buildMonthRowDateRange(rowMonths) ?? buildMonthDateRange(bestMonth.date);
  }, [years]);

  const syncRenderedRange = useCallback((scroller: HTMLDivElement) => {
    const nextRange = getRenderedRangeFromScroll(scroller);
    if (!nextRange) return;

    setRenderedRange((currentRange) => isSameCalendarDateRange(currentRange, nextRange) ? currentRange : nextRange);
  }, [getRenderedRangeFromScroll]);

  useEffect(() => {
    if (!onRenderedRangeChange) return;

    if (renderedRangeNotifyTimeoutRef.current !== null) {
      window.clearTimeout(renderedRangeNotifyTimeoutRef.current);
    }

    renderedRangeNotifyTimeoutRef.current = window.setTimeout(() => {
      renderedRangeNotifyTimeoutRef.current = null;

      startTransition(() => {
        onRenderedRangeChange(renderedRange);
      });
    }, YEAR_RENDERED_RANGE_NOTIFY_DELAY_MS);

    return () => {
      if (renderedRangeNotifyTimeoutRef.current === null) return;

      window.clearTimeout(renderedRangeNotifyTimeoutRef.current);
      renderedRangeNotifyTimeoutRef.current = null;
    };
  }, [onRenderedRangeChange, renderedRange]);

  const setYearSectionRef = useCallback((yearKey: string, node: HTMLElement | null) => {
    if (node) {
      yearSectionRefsMap.current.set(yearKey, node);
    } else {
      yearSectionRefsMap.current.delete(yearKey);
    }
  }, []);

  const setMonthSectionRef = useCallback((monthKey: string, node: HTMLElement | null) => {
    if (node) {
      monthSectionRefsMap.current.set(monthKey, node);
    } else {
      monthSectionRefsMap.current.delete(monthKey);
    }
  }, []);

  const getCurrentRangeAnchor = useCallback((scroller: HTMLDivElement): YearRangeAnchor | null => {
    let bestSection: HTMLElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const year of years) {
      const section = yearSectionRefsMap.current.get(year.key);
      if (!section) continue;

      const distance = Math.abs(section.offsetTop - scroller.scrollTop);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSection = section;
      }
    }

    const yearKey = bestSection?.dataset.calendarYearKey;
    if (!bestSection || !yearKey) return null;

    return {
      yearKey,
      offsetTop: bestSection.offsetTop - scroller.scrollTop,
    };
  }, [years]);

  useEffect(() => {
    const nextRequestedYearKey = format(startOfYear(yearDate), "yyyy");

    if (requestedYearKeyRef.current === nextRequestedYearKey) return;

    requestedYearKeyRef.current = nextRequestedYearKey;
    pendingScrollYearKeyRef.current = nextRequestedYearKey;
    rangeAnchorRef.current = null;
    isExtendingBeforeRef.current = false;
    isExtendingAfterRef.current = false;
    setRenderedRange(buildMonthDateRange(yearDate));
    setAnchorYear(startOfYear(yearDate));
    setYearOffsetRange({
      startOffset: -INITIAL_YEAR_BUFFER,
      endOffset: INITIAL_YEAR_BUFFER,
    });
  }, [yearDate]);

  useLayoutEffect(() => {
    const targetYearKey = pendingScrollYearKeyRef.current;
    if (!targetYearKey) return;

    const scroller = scrollContainerRef.current;
    const targetSection = yearSectionRefsMap.current.get(targetYearKey);
    if (!scroller || !targetSection) return;

    scroller.scrollTop = Math.max(0, targetSection.offsetTop);
    lastScrollTopRef.current = scroller.scrollTop;
    pendingScrollYearKeyRef.current = null;
    syncRenderedRange(scroller);
  }, [syncRenderedRange, years]);

  useLayoutEffect(() => {
    const rangeAnchor = rangeAnchorRef.current;
    if (!rangeAnchor) {
      isExtendingBeforeRef.current = false;
      isExtendingAfterRef.current = false;
      return;
    }

    const scroller = scrollContainerRef.current;
    const anchorSection = yearSectionRefsMap.current.get(rangeAnchor.yearKey);

    if (!scroller || !anchorSection) {
      rangeAnchorRef.current = null;
      isExtendingBeforeRef.current = false;
      isExtendingAfterRef.current = false;
      return;
    }

    scroller.scrollTop = anchorSection.offsetTop - rangeAnchor.offsetTop;
    lastScrollTopRef.current = scroller.scrollTop;
    rangeAnchorRef.current = null;
    isExtendingBeforeRef.current = false;
    isExtendingAfterRef.current = false;
    syncRenderedRange(scroller);
  }, [syncRenderedRange, years]);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    const handleScroll = () => {
      const previousScrollTop = lastScrollTopRef.current;
      const currentScrollTop = scroller.scrollTop;
      const isScrollingUp = currentScrollTop < previousScrollTop;
      const isScrollingDown = currentScrollTop > previousScrollTop;
      lastScrollTopRef.current = currentScrollTop;
      syncRenderedRange(scroller);

      if (
        isScrollingUp &&
        currentScrollTop < YEAR_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingBeforeRef.current
      ) {
        isExtendingBeforeRef.current = true;
        rangeAnchorRef.current = getCurrentRangeAnchor(scroller);

        setYearOffsetRange((currentRange) => {
          const shouldTrimAfter = currentRange.endOffset - currentRange.startOffset + 1 + YEAR_EXTEND_COUNT > YEAR_MAX_RENDERED_YEARS;

          return {
            startOffset: currentRange.startOffset - YEAR_EXTEND_COUNT,
            endOffset: shouldTrimAfter ? currentRange.endOffset - YEAR_EXTEND_COUNT : currentRange.endOffset,
          };
        });
      }

      const distToBottom = scroller.scrollHeight - scroller.clientHeight - currentScrollTop;

      if (
        isScrollingDown &&
        distToBottom < YEAR_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingAfterRef.current
      ) {
        isExtendingAfterRef.current = true;
        rangeAnchorRef.current = getCurrentRangeAnchor(scroller);

        setYearOffsetRange((currentRange) => ({
          startOffset: currentRange.endOffset - currentRange.startOffset + 1 + YEAR_EXTEND_COUNT > YEAR_MAX_RENDERED_YEARS ? currentRange.startOffset + YEAR_EXTEND_COUNT : currentRange.startOffset,
          endOffset: currentRange.endOffset + YEAR_EXTEND_COUNT,
        }));
      }
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [getCurrentRangeAnchor, syncRenderedRange]);

  return (
    <div
      ref={scrollContainerRef}
      className="calendar-year-view min-h-0 flex-1 overflow-y-auto bg-[rgba(255,255,255,0.92)] px-4 pb-5 pt-4"
    >
      <div className="space-y-8">
        {years.map((year) => (
          <section
            key={year.key}
            ref={(node) => setYearSectionRef(year.key, node)}
            data-calendar-year-key={year.key}
            className="calendar-year-section min-w-0 bg-white"
            aria-label={year.label}
          >
            <h2 className="mb-4 px-1 text-[17px] font-semibold leading-none tracking-[-0.01em] text-[#1c1c1e]">
              {year.label}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {year.months.map((month) => (
                <section
                  key={month.key}
                  ref={(node) => setMonthSectionRef(month.key, node)}
                  data-calendar-month-key={month.key}
                  className="min-w-0 bg-white px-4 pb-3 pt-3"
                  aria-label={month.label}
                >
                  <h3 className="mb-3 text-[15px] font-semibold leading-none tracking-[-0.01em] text-[#1c1c1e]">
                    {month.label}
                  </h3>

                  <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold leading-none text-[#8e8e93]">
                    {t.miniCalendarWeekdays.map((weekday, index) => (
                      <div key={`${weekday}-${index}`} className="flex h-5 items-center justify-center">
                        {weekday}
                      </div>
                    ))}
                  </div>

                  <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-[12px] leading-none">
                    {month.weeks.flat().map((day) => {
                      const selected = day.isCurrentMonth && isSameDay(day.date, selectedDate);
                      const isToday = isSameDay(day.date, today);
                      const eventCount = day.events?.count ?? 0;

                      return (
                        <button
                          key={day.key}
                          type="button"
                          aria-label={createDayAriaLabel(day.date, eventCount)}
                          aria-pressed={selected}
                          title={eventCount > 0 ? `${eventCount}件` : undefined}
                          className={cn(
                            "mx-auto flex h-6 w-6 items-center justify-center rounded-full font-medium transition-colors duration-150 ease-out",
                            "appearance-none select-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7cc]",
                            selected
                              ? "bg-[#3478f6] text-white shadow-[0_1px_2px_rgba(52,120,246,0.25)]"
                              : isToday
                                ? "text-[#3478f6]"
                                : day.isCurrentMonth
                                  ? "text-[#2c2c2e] hover:bg-[#f2f2f7]"
                                  : "text-[#b8b8bd] hover:bg-[#f7f7f7]",
                          )}
                          style={getDayButtonStyle(day, selected)}
                          onClick={() => onSelectDate(day.date)}
                        >
                          {day.dayOfMonth}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const CalendarYearView = memo(CalendarYearViewComponent);

CalendarYearView.displayName = "CalendarYearView";

export { CalendarYearView };
