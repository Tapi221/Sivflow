import { memo, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useDateFnsLocale, useT } from "@shared/i18n/useT";
import { cn } from "@web-renderer/lib/utils";
import { addDays, addYears, eachMonthOfInterval, endOfDay, endOfYear, format, isSameMonth, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import type { CalendarWeekStartDay } from "@/features/calendar/calendar.types";
import { getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { getCalendarWeekStartsOn, rotateCalendarWeekdayLabels } from "@/features/calendar/calendarWeekStart";
import { DEFAULT_CALENDAR_MONTH_WEEK_START_DAY } from "@/features/calendar/model/calendarMonth.model";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarYearEventPriority = {
  group: number;
  index: number;
};
type CalendarYearEventDisplay = {
  color?: string;
  priority: CalendarYearEventPriority;
};
type CalendarYearEventDisplayResolver = (event: GoogleCalendarEvent) => CalendarYearEventDisplay;
type CalendarYearViewProps = {
  yearDate: Date;
  selectedDate: Date;
  weekStartDay?: CalendarWeekStartDay;
  visibleEvents?: GoogleCalendarEvent[];
  eventDisplayResolver?: CalendarYearEventDisplayResolver;
  onSelectDate: (date: Date) => void;
  onRenderedRangeChange?: (range: CalendarDateRange) => void;
  onSyncRangeChange?: (range: CalendarDateRange) => void;
};
type CalendarYearEventTone = "blue" | "emerald" | "rose" | "amber" | "violet" | "zinc";
type CalendarYearDayEvents = {
  count: number;
  tone: CalendarYearEventTone;
  priority: CalendarYearEventPriority;
};
type CalendarYearDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  events: CalendarYearDayEvents | null;
};
type CalendarYearWeek = {
  key: string;
  days: CalendarYearDay[];
};
type CalendarYearMonth = {
  key: string;
  date: Date;
  label: string;
  weeks: CalendarYearWeek[];
};
type CalendarYearBlock = {
  key: string;
  date: Date;
  label: string;
  months: CalendarYearMonth[];
};
type YearVirtualWindow = {
  startOffset: number;
  endOffset: number;
};



const YEAR_MONTH_GRID_DAY_COUNT = 42;
const YEAR_INITIAL_RENDERED_FUTURE_YEARS = 3;
const YEAR_EXTEND_YEARS = 1;
const YEAR_SCROLL_EDGE_THRESHOLD_PX = 1280;
const YEAR_SYNC_RANGE_NOTIFY_DELAY_MS = 200;
const YEAR_SCROLL_SYNC_DEBOUNCE_MS = 100;
const YEAR_SYNC_RANGE_SAMPLE_OFFSET_PX = 160;
const EMPTY_YEAR_EVENTS: GoogleCalendarEvent[] = [];
const DEFAULT_YEAR_EVENT_PRIORITY: CalendarYearEventPriority = { group: Number.MAX_SAFE_INTEGER, index: Number.MAX_SAFE_INTEGER };
const DEFAULT_YEAR_EVENT_DISPLAY: CalendarYearEventDisplay = { priority: DEFAULT_YEAR_EVENT_PRIORITY };
const YEAR_EVENT_TONE_CLASSES: Record<CalendarYearEventTone, string> = {
  blue: "bg-blue-100",
  emerald: "bg-emerald-100",
  rose: "bg-rose-100",
  amber: "bg-amber-100",
  violet: "bg-violet-100",
  zinc: "bg-zinc-100",
};



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
const colorToYearEventTone = (color: string): CalendarYearEventTone => {
  const normalized = normalizeColor(color);
  const match = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (!match) return "zinc";
  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  if (red >= 180 && green >= 120 && blue < 140) return "amber";
  if (green >= red + 24 && green >= blue + 8) return "emerald";
  if (blue >= red + 24 && blue >= green + 8) return "blue";
  if (red >= 120 && blue >= 120) return "violet";
  if (red >= green + 24 && red >= blue + 24) return "rose";
  return "zinc";
};
const resolveDefaultYearEventDisplay: CalendarYearEventDisplayResolver = () => DEFAULT_YEAR_EVENT_DISPLAY;
const compareCalendarYearEventPriority = (left: CalendarYearEventPriority, right: CalendarYearEventPriority): number => {
  const groupDiff = left.group - right.group;
  if (groupDiff !== 0) return groupDiff;
  return left.index - right.index;
};
const buildEventsByDay = (events: GoogleCalendarEvent[], eventDisplayResolver: CalendarYearEventDisplayResolver = resolveDefaultYearEventDisplay): Map<string, CalendarYearDayEvents> => {
  const eventsByDay = new Map<string, CalendarYearDayEvents>();
  for (const event of events) {
    const display = eventDisplayResolver(event);
    const tone = colorToYearEventTone(display.color ?? event.accentColor);
    for (const dayKey of getEventDateKeys(event)) {
      const current = eventsByDay.get(dayKey);
      if (current) {
        current.count += 1;
        if (compareCalendarYearEventPriority(display.priority, current.priority) < 0) {
          current.tone = tone;
          current.priority = display.priority;
        }
      } else {
        eventsByDay.set(dayKey, {
          count: 1,
          tone,
          priority: display.priority,
        });
      }
    }
  }
  return eventsByDay;
};
const buildMonthDays = (monthDate: Date, eventsByDay: Map<string, CalendarYearDayEvents>, weekStartDay: CalendarWeekStartDay): CalendarYearDay[] => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: getCalendarWeekStartsOn(weekStartDay) });
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
const chunkMonthWeeks = (monthKey: string, days: CalendarYearDay[]): CalendarYearWeek[] => {
  const weeks: CalendarYearWeek[] = [];
  for (let index = 0; index < days.length; index += 7) {
    const weekDays = days.slice(index, index + 7);
    const firstDay = weekDays[0];
    if (!firstDay) continue;
    weeks.push({ key: `${monthKey}:${firstDay.key}`, days: weekDays });
  }
  return weeks;
};
const buildYearDateRange = (years: CalendarYearBlock[]): CalendarDateRange | null => {
  const firstYear = years[0];
  const lastYear = years[years.length - 1];
  if (!firstYear || !lastYear) return null;
  return {
    start: startOfYear(firstYear.date),
    end: endOfDay(endOfYear(lastYear.date)),
  };
};
const buildYearSyncDateRange = (date: Date): CalendarDateRange => ({
  start: startOfYear(date),
  end: endOfDay(endOfYear(date)),
});
const isSameCalendarDateRange = (left: CalendarDateRange, right: CalendarDateRange): boolean => left.start.getTime() === right.start.getTime() && left.end.getTime() === right.end.getTime();
const createInitialYearVirtualWindow = (): YearVirtualWindow => ({
  startOffset: 0,
  endOffset: YEAR_INITIAL_RENDERED_FUTURE_YEARS,
});
const isSameYearVirtualWindow = (left: YearVirtualWindow, right: YearVirtualWindow): boolean => left.startOffset === right.startOffset && left.endOffset === right.endOffset;
const getDayEventToneClassName = (day: CalendarYearDay, selected: boolean): string | null => {
  if (selected || !day.events) return null;
  return YEAR_EVENT_TONE_CLASSES[day.events.tone];
};



const CalendarYearViewComponent = ({
  yearDate,
  selectedDate,
  weekStartDay = DEFAULT_CALENDAR_MONTH_WEEK_START_DAY,
  visibleEvents = EMPTY_YEAR_EVENTS,
  eventDisplayResolver,
  onSelectDate,
  onRenderedRangeChange,
  onSyncRangeChange,
}: CalendarYearViewProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => getCalendarDateKey(today), [today]);
  const selectedDateKey = useMemo(() => getCalendarDateKey(selectedDate), [selectedDate]);
  const weekdayLabels = useMemo(() => rotateCalendarWeekdayLabels(t.calendarMonthWeekdays, weekStartDay), [t.calendarMonthWeekdays, weekStartDay]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const syncRangeNotifyTimeoutRef = useRef<number | null>(null);
  const syncRangeScrollTimeoutRef = useRef<number | null>(null);
  const pendingSyncScrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollScrollerRef = useRef<HTMLDivElement | null>(null);
  const requestedYearKeyRef = useRef(format(startOfYear(yearDate), "yyyy"));
  const baseYearRef = useRef(startOfYear(yearDate));
  const virtualWindowRef = useRef(createInitialYearVirtualWindow());
  const [virtualWindow, setVirtualWindowState] = useState(() => virtualWindowRef.current);
  const [syncRange, setSyncRange] = useState(() => buildYearSyncDateRange(yearDate));
  const deferredVisibleEvents = useDeferredValue(visibleEvents);
  const eventsByDay = useMemo(() => buildEventsByDay(deferredVisibleEvents, eventDisplayResolver), [deferredVisibleEvents, eventDisplayResolver]);
  const buildYearMonths = useCallback(
    (targetYear: Date): CalendarYearMonth[] => {
      return eachMonthOfInterval({
        start: startOfYear(targetYear),
        end: endOfYear(targetYear),
      }).map((monthDate) => {
        const monthKey = format(monthDate, "yyyy-MM");
        const days = buildMonthDays(monthDate, eventsByDay, weekStartDay);
        return {
          key: monthKey,
          date: monthDate,
          label: format(monthDate, t.dateFnsLocaleKey === "ja" ? "M月" : "MMM", { locale: dateFnsLocale }),
          weeks: chunkMonthWeeks(monthKey, days),
        };
      });
    },
    [dateFnsLocale, eventsByDay, t.dateFnsLocaleKey, weekStartDay],
  );
  const years = useMemo(() => {
    const yearCount = Math.max(0, virtualWindow.endOffset - virtualWindow.startOffset + 1);
    return Array.from({ length: yearCount }, (_, index) => {
      const date = startOfYear(addYears(baseYearRef.current, virtualWindow.startOffset + index));
      return {
        key: format(date, "yyyy"),
        date,
        label: format(date, "yyyy年", { locale: dateFnsLocale }),
        months: buildYearMonths(date),
      };
    });
  }, [buildYearMonths, dateFnsLocale, virtualWindow.endOffset, virtualWindow.startOffset]);
  const renderedRange = useMemo(() => buildYearDateRange(years), [years]);
  const setVirtualWindow = useCallback((nextWindow: YearVirtualWindow) => {
    if (isSameYearVirtualWindow(virtualWindowRef.current, nextWindow)) return;
    virtualWindowRef.current = nextWindow;
    startTransition(() => {
      setVirtualWindowState(nextWindow);
    });
  }, [setVirtualWindowState]);
  const updateVirtualWindowForScroll = useCallback((scroller: HTMLDivElement) => {
    const distanceToBottom = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
    const shouldExtendAfter = distanceToBottom <= YEAR_SCROLL_EDGE_THRESHOLD_PX;
    const currentWindow = virtualWindowRef.current;
    if (!shouldExtendAfter) return;
    const nextWindow = {
      startOffset: currentWindow.startOffset,
      endOffset: currentWindow.endOffset + YEAR_EXTEND_YEARS,
    };
    setVirtualWindow(nextWindow);
  }, [setVirtualWindow]);
  const getSyncRangeFromScroll = useCallback((scroller: HTMLDivElement): CalendarDateRange | null => {
    const sampleScrollTop = scroller.scrollTop + Math.min(YEAR_SYNC_RANGE_SAMPLE_OFFSET_PX, scroller.clientHeight / 2);
    const sections = Array.from(scroller.querySelectorAll<HTMLElement>(".calendar-year-section"));
    let bestSection: HTMLElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const section of sections) {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      const distance = sampleScrollTop < sectionTop ? sectionTop - sampleScrollTop : sampleScrollTop > sectionBottom ? sampleScrollTop - sectionBottom : 0;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSection = section;
      }
    }
    const yearOffset = Number.parseInt(bestSection?.dataset.calendarYearOffset ?? "0", 10);
    const targetYear = addYears(baseYearRef.current, Number.isFinite(yearOffset) ? yearOffset : 0);
    return buildYearSyncDateRange(targetYear);
  }, []);
  const syncVisibleYearRange = useCallback((scroller: HTMLDivElement) => {
    const nextRange = getSyncRangeFromScroll(scroller);
    if (!nextRange) return;
    setSyncRange((currentRange) => isSameCalendarDateRange(currentRange, nextRange) ? currentRange : nextRange);
  }, [getSyncRangeFromScroll, setSyncRange]);
  const scheduleSyncVisibleYearRange = useCallback((scroller: HTMLDivElement) => {
    pendingSyncScrollerRef.current = scroller;
    if (syncRangeScrollTimeoutRef.current !== null) return;
    syncRangeScrollTimeoutRef.current = window.setTimeout(() => {
      syncRangeScrollTimeoutRef.current = null;
      const pendingScroller = pendingSyncScrollerRef.current;
      pendingSyncScrollerRef.current = null;
      if (!pendingScroller) return;
      syncVisibleYearRange(pendingScroller);
    }, YEAR_SCROLL_SYNC_DEBOUNCE_MS);
  }, [syncVisibleYearRange]);
  useEffect(() => {
    if (!renderedRange) return;
    onRenderedRangeChange?.(renderedRange);
  }, [onRenderedRangeChange, renderedRange]);
  useEffect(() => {
    if (!onSyncRangeChange) return;
    if (syncRangeNotifyTimeoutRef.current !== null) {
      window.clearTimeout(syncRangeNotifyTimeoutRef.current);
    }
    syncRangeNotifyTimeoutRef.current = window.setTimeout(() => {
      syncRangeNotifyTimeoutRef.current = null;
      startTransition(() => {
        onSyncRangeChange(syncRange);
      });
    }, YEAR_SYNC_RANGE_NOTIFY_DELAY_MS);
    return () => {
      if (syncRangeNotifyTimeoutRef.current === null) return;
      window.clearTimeout(syncRangeNotifyTimeoutRef.current);
      syncRangeNotifyTimeoutRef.current = null;
    };
  }, [onSyncRangeChange, syncRange]);
  useEffect(() => {
    return () => {
      if (syncRangeScrollTimeoutRef.current !== null) {
        window.clearTimeout(syncRangeScrollTimeoutRef.current);
        syncRangeScrollTimeoutRef.current = null;
      }
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      pendingSyncScrollerRef.current = null;
      pendingScrollScrollerRef.current = null;
    };
  }, []);
  useEffect(() => {
    const nextRequestedYearKey = format(startOfYear(yearDate), "yyyy");
    if (requestedYearKeyRef.current === nextRequestedYearKey) return;
    requestedYearKeyRef.current = nextRequestedYearKey;
    baseYearRef.current = startOfYear(yearDate);
    setSyncRange(buildYearSyncDateRange(yearDate));
    setVirtualWindow(createInitialYearVirtualWindow());
  }, [setVirtualWindow, yearDate]);
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;
    const flushScroll = (pendingScroller: HTMLDivElement) => {
      updateVirtualWindowForScroll(pendingScroller);
      scheduleSyncVisibleYearRange(pendingScroller);
    };
    const handleScroll = () => {
      pendingScrollScrollerRef.current = scroller;
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const pendingScroller = pendingScrollScrollerRef.current;
        pendingScrollScrollerRef.current = null;
        if (!pendingScroller) return;
        flushScroll(pendingScroller);
      });
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      pendingScrollScrollerRef.current = null;
    };
  }, [scheduleSyncVisibleYearRange, updateVirtualWindowForScroll]);
  return (
    <div
      ref={scrollContainerRef}
      className="calendar-year-view min-h-0 flex-1 overflow-y-auto bg-white/90"
    >
      <div className="px-4 pb-5 pt-4">
        {years.map((year) => (
          <section
            key={year.key}
            data-calendar-year-key={year.key}
            data-calendar-year-offset={year.date.getFullYear() - baseYearRef.current.getFullYear()}
            className="calendar-year-section mb-8 min-w-0 bg-white"
            aria-label={year.label}
          >
            <h2 className="mb-4 px-1 text-base font-semibold leading-none tracking-tight text-zinc-900">
              {year.label}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {year.months.map((month) => (
                <section
                  key={month.key}
                  className="min-w-0 bg-white px-4 pb-3 pt-3"
                  aria-label={month.label}
                >
                  <h3 className="mb-3 text-sm font-semibold leading-none tracking-tight text-zinc-900">
                    {month.label}
                  </h3>
                  <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-semibold leading-none text-zinc-500">
                    {weekdayLabels.map((weekday, index) => (
                      <div key={`${weekday}-${index}`} className="flex h-5 items-center justify-center">
                        {weekday}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 space-y-1 text-center text-xs leading-none">
                    {month.weeks.map((week) => (
                      <div key={week.key} data-calendar-week-key={week.key} className="grid grid-cols-7 gap-y-1">
                        {week.days.map((day) => {
                          const selected = day.isCurrentMonth && day.key === selectedDateKey;
                          const isToday = day.key === todayKey;
                          const eventCount = day.events?.count ?? 0;
                          return (
                            <button
                              key={day.key}
                              type="button"
                              aria-label={createDayAriaLabel(day.date, eventCount)}
                              aria-pressed={selected}
                              title={eventCount > 0 ? `${eventCount}件` : undefined}
                              className={cn(
                                "mx-auto flex h-6 w-6 items-center justify-center rounded-full font-medium transition-colors duration-200 ease-out",
                                "appearance-none select-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
                                getDayEventToneClassName(day, selected),
                                selected
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : isToday
                                    ? "text-blue-500"
                                    : day.isCurrentMonth
                                      ? "text-zinc-800 hover:bg-zinc-100"
                                      : "text-zinc-400 hover:bg-zinc-100",
                              )}
                              onClick={() => onSelectDate(day.date)}
                            >
                              {day.dayOfMonth}
                            </button>
                          );
                        })}
                      </div>
                    ))}
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


export type { CalendarYearEventPriority, CalendarYearEventDisplay, CalendarYearEventDisplayResolver };
