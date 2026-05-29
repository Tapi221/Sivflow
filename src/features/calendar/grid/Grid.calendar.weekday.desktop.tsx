import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarDateButton, CalendarDateContent } from "@/chip/button/GridHeader.scheduletimeline";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { computeEventLayout, toLayoutEvent } from "@/chip/eventchip/EventChip.weekday.placement";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { CalendarWeekDayGridProps } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { buildScheduleVirtualRailDays } from "./ScheduleColumn.shared";
import * as COLOR from "./grid.color.constants.desktop";
import * as GRID from "./grid.layout.constants.desktop";

type CalendarEventPositionStyle = CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

type WeekdayDayEvents = {
  allDayEvents: GoogleCalendarEvent[];
  timedEvents: GoogleCalendarEvent[];
};

type WeekdayVirtualDayRange = {
  start: number;
  end: number;
};

type WeekdayRenderedDayEntry = {
  day: Date;
  dayIndex: number;
};

type CurrentTimeLabelProps = {
  currentMinutes: number;
};

type CurrentTimeIndicatorProps = {
  isToday: boolean;
  currentMinutes: number;
};

const HOURS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, index) => index);
const HOUR_BOUNDARY_LABELS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, index) => index + 1);
const MAX_ALL_DAY_VISIBLE_CHIPS = 3;
const BOTTOM_BOUNDARY_LABEL_SPACER_HEIGHT = 32;
const HORIZONTAL_DAY_OVERSCAN = 4;
const WEEKDAY_HEADER_ROW_HEIGHT = 40;

const EMPTY_WEEKDAY_DAY_EVENTS: WeekdayDayEvents = {
  allDayEvents: [],
  timedEvents: [],
};

const WEEKDAY_HEADER_CORNER_STYLE: CSSProperties = {
  gridColumn: 1,
  gridRow: 1,
  left: 0,
  position: "sticky",
  top: 0,
  width: C.TIME_COLUMN_WIDTH,
};

const WEEKDAY_ALL_DAY_LABEL_STYLE: CSSProperties = {
  gridColumn: 1,
  gridRow: 2,
  left: 0,
  position: "sticky",
  top: WEEKDAY_HEADER_ROW_HEIGHT,
  width: C.TIME_COLUMN_WIDTH,
};

const WEEKDAY_TIME_COLUMN_STYLE: CSSProperties = {
  gridColumn: 1,
  gridRow: 3,
  left: 0,
  position: "sticky",
  width: C.TIME_COLUMN_WIDTH,
};

const createHourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const createMinuteLabel = (totalMinutes: number) => {
  const hour = Math.floor(totalMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR);
  const minutes = totalMinutes % GRID.WEEKDAY_MINUTES_PER_HOUR;

  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const getEventDurationMinutes = (event: GoogleCalendarEvent): number => {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const diff = end - start;

  return diff > 0 ? diff / 60000 : 30;
};

const getVisualDurationMinutes = (durationMinutes: number) => Math.max(durationMinutes, C.MIN_LAYOUT_MINUTES);

const calculateEventPositionStyle = (event: GoogleCalendarEvent): CalendarEventPositionStyle => {
  const startsAt = new Date(event.startsAt);
  const startHour = startsAt.getHours() + startsAt.getMinutes() / GRID.WEEKDAY_MINUTES_PER_HOUR;
  const durationMinutes = getEventDurationMinutes(event);
  const visualDurationMinutes = getVisualDurationMinutes(durationMinutes);

  return {
    [GRID.WEEKDAY_CSS_VAR_EVENT_START_HOUR]: Math.max(0, startHour),
    [GRID.WEEKDAY_CSS_VAR_EVENT_DURATION_HOURS]: visualDurationMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR,
    top: `calc(var(${GRID.WEEKDAY_CSS_VAR_EVENT_START_HOUR}) * var(--calendar-hour-row-height))`,
    height: `max(1px, calc(var(${GRID.WEEKDAY_CSS_VAR_EVENT_DURATION_HOURS}) * var(--calendar-hour-row-height) - 2px))`,
  } as CalendarEventPositionStyle;
};

const areSameVisibleDays = (previous: Date[], next: Date[]) => {
  if (previous.length !== next.length) return false;

  return previous.every((day, index) => day.getTime() === next[index]?.getTime());
};

const areCalendarWeekDayGridPropsEqual = (previous: CalendarWeekDayGridProps, next: CalendarWeekDayGridProps) => {
  return (
    previous.scrollContainerRef === next.scrollContainerRef &&
    previous.virtualRail === next.virtualRail &&
    previous.visibleEvents === next.visibleEvents &&
    previous._calendarDayColumnWidth === next._calendarDayColumnWidth &&
    previous.calendarGridStyle === next.calendarGridStyle &&
    previous.onScroll === next.onScroll &&
    previous.onSelectDate === next.onSelectDate &&
    previous.selectedDate.getTime() === next.selectedDate.getTime() &&
    areSameVisibleDays(previous.visibleDays, next.visibleDays)
  );
};

const createInitialVirtualDayRange = (totalDayCount: number, visibleDayCount: number, anchorIndex: number): WeekdayVirtualDayRange => {
  if (totalDayCount <= 0) return { start: 0, end: 0 };

  const visibleCount = Math.max(1, visibleDayCount);
  const boundedAnchorIndex = Math.max(0, Math.min(anchorIndex, totalDayCount - 1));
  const start = Math.max(0, boundedAnchorIndex - HORIZONTAL_DAY_OVERSCAN);
  const end = Math.min(totalDayCount, boundedAnchorIndex + visibleCount + HORIZONTAL_DAY_OVERSCAN);

  return { start, end: Math.max(start, end) };
};

const AllDayEventChip = ({ event }: { event: GoogleCalendarEvent }) => {
  const tokens = generateColorTokens(event.accentColor);

  return (
    <div className={cn(eventChipAllDayClass, "truncate")} style={{ background: tokens.bg, color: tokens.text }} title={event.title || "Untitled"}>
      {event.title || "Untitled"}
    </div>
  );
};

const useCurrentTimeMinutes = (): number => {
  const getNow = () => {
    const d = new Date();

    return d.getHours() * GRID.WEEKDAY_MINUTES_PER_HOUR + d.getMinutes();
  };

  const [minutes, setMinutes] = useState(getNow);

  useEffect(() => {
    const now = new Date();
    const msUntilNextMinute = (GRID.WEEKDAY_SECONDS_PER_MINUTE - now.getSeconds()) * GRID.WEEKDAY_MS_PER_SECOND - now.getMilliseconds();
    let intervalId: number | null = null;

    const timeoutId = window.setTimeout(() => {
      setMinutes(getNow());

      intervalId = window.setInterval(() => {
        setMinutes(getNow());
      }, GRID.WEEKDAY_CURRENT_TIME_UPDATE_INTERVAL_MS);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return minutes;
};

const CurrentTimeLabel = ({ currentMinutes }: CurrentTimeLabelProps) => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-30 flex h-6 -translate-y-1/2 select-none items-center justify-end bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,white_32%,white_68%,rgba(255,255,255,0)_100%)] pr-2 text-[12px] font-semibold leading-none tabular-nums text-[#3f7fc5]" style={{ top: `calc(${currentMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(--calendar-hour-row-height))` }}>
      {createMinuteLabel(currentMinutes)}
    </div>
  );
};

const CurrentTimeIndicator = ({ isToday, currentMinutes }: CurrentTimeIndicatorProps) => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10" style={{ top: `calc(${currentMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(--calendar-hour-row-height))` }}>
      <div style={{ height: GRID.WEEKDAY_CURRENT_TIME_INDICATOR_HEIGHT, background: isToday ? COLOR.WEEKDAY_COLOR_PRIMARY : "transparent", borderTop: isToday ? "none" : `${GRID.WEEKDAY_CURRENT_TIME_INDICATOR_HEIGHT}px ${GRID.WEEKDAY_CURRENT_TIME_DASHED_STYLE} ${COLOR.WEEKDAY_COLOR_PRIMARY_SOFT}` }} />
    </div>
  );
};

const getVirtualRange = (scrollLeft: number, clientWidth: number, columnWidth: number, totalDayCount: number): WeekdayVirtualDayRange => {
  const scrollableLeft = Math.max(0, scrollLeft - C.TIME_COLUMN_WIDTH);
  const visibleRight = Math.max(0, scrollLeft + clientWidth - C.TIME_COLUMN_WIDTH);
  const start = Math.max(0, Math.floor(scrollableLeft / columnWidth) - HORIZONTAL_DAY_OVERSCAN);
  const end = Math.min(totalDayCount, Math.ceil(visibleRight / columnWidth) + HORIZONTAL_DAY_OVERSCAN);

  return { start, end: Math.max(start, end) };
};

const areVirtualRangesEqual = (previous: WeekdayVirtualDayRange, next: WeekdayVirtualDayRange) => previous.start === next.start && previous.end === next.end;

const buildFallbackRenderedEntries = (visibleDays: Date[]): WeekdayRenderedDayEntry[] => visibleDays.map((day, dayIndex) => ({ day, dayIndex }));

const getRenderedDayGridColumn = (dayIndex: number, virtualDayRange: WeekdayVirtualDayRange, hasVirtualRail: boolean) => hasVirtualRail ? dayIndex - virtualDayRange.start + 3 : dayIndex + 2;

const buildVirtualizedGridStyle = (calendarGridStyle: CSSProperties, virtualDayRange: WeekdayVirtualDayRange, totalDayCount: number, _calendarDayColumnWidth: number): CSSProperties => {
  const renderedDayCount = Math.max(0, virtualDayRange.end - virtualDayRange.start);
  const renderedDayColumns = renderedDayCount > 0 ? `repeat(${renderedDayCount}, ${_calendarDayColumnWidth}px)` : "0px";
  const leftSpacerWidth = Math.max(0, virtualDayRange.start * _calendarDayColumnWidth);
  const rightSpacerWidth = Math.max(0, (totalDayCount - virtualDayRange.end) * _calendarDayColumnWidth);

  return {
    ...calendarGridStyle,
    gridTemplateColumns: `${C.TIME_COLUMN_WIDTH}px ${leftSpacerWidth}px ${renderedDayColumns} ${rightSpacerWidth}px`,
    minWidth: `${C.TIME_COLUMN_WIDTH + totalDayCount * _calendarDayColumnWidth}px`,
  };
};

const CalendarWeekDayGridComponent = ({
  headerScrollRef: _headerScrollRef,
  allDayScrollRef: _allDayScrollRef,
  scrollContainerRef,
  visibleDays,
  virtualRail,
  visibleEvents,
  _calendarDayColumnWidth,
  calendarGridStyle,
  onScroll,
  selectedDate,
  onSelectDate,
}: CalendarWeekDayGridProps) => {
  const today = new Date();
  const currentMinutes = useCurrentTimeMinutes();
  const totalDayCount = virtualRail?.totalDayCount ?? visibleDays.length;
  const [virtualDayRange, setVirtualDayRange] = useState<WeekdayVirtualDayRange>(() => createInitialVirtualDayRange(totalDayCount, visibleDays.length, virtualRail?.anchorIndex ?? 0));

  const updateVirtualDayRange = useCallback(() => {
    const scroller = scrollContainerRef.current;

    if (!scroller || _calendarDayColumnWidth <= 0 || totalDayCount === 0) {
      setVirtualDayRange({ start: 0, end: totalDayCount });
      return;
    }

    const nextRange = getVirtualRange(scroller.scrollLeft, scroller.clientWidth, _calendarDayColumnWidth, totalDayCount);

    setVirtualDayRange((previous) => areVirtualRangesEqual(previous, nextRange) ? previous : nextRange);
  }, [_calendarDayColumnWidth, scrollContainerRef, totalDayCount]);

  useLayoutEffect(() => {
    updateVirtualDayRange();
  }, [updateVirtualDayRange]);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    let rafId: number | null = null;

    const scheduleUpdate = () => {
      if (rafId !== null) return;

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateVirtualDayRange();
      });
    };

    scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
    const initialFrameId = window.requestAnimationFrame(updateVirtualDayRange);

    return () => {
      scroller.removeEventListener("scroll", scheduleUpdate);
      window.cancelAnimationFrame(initialFrameId);

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [scrollContainerRef, updateVirtualDayRange]);

  const renderedDayEntries = useMemo<WeekdayRenderedDayEntry[]>(() => {
    if (!virtualRail) return buildFallbackRenderedEntries(visibleDays);

    return buildScheduleVirtualRailDays(virtualRail, virtualDayRange.start, virtualDayRange.end).map((day, offset) => ({
      day,
      dayIndex: virtualDayRange.start + offset,
    }));
  }, [virtualDayRange.end, virtualDayRange.start, virtualRail, visibleDays]);

  const selectedDayKey = getCalendarDateKey(selectedDate);
  const todayDayKey = getCalendarDateKey(today);
  const hasVirtualRail = Boolean(virtualRail);
  const isTodayVisible = renderedDayEntries.some(({ day }) => getCalendarDateKey(day) === todayDayKey);
  const gridStyle = useMemo(() => {
    if (!virtualRail) return calendarGridStyle;

    return buildVirtualizedGridStyle(calendarGridStyle, virtualDayRange, virtualRail.totalDayCount, _calendarDayColumnWidth);
  }, [_calendarDayColumnWidth, calendarGridStyle, virtualDayRange, virtualRail]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, WeekdayDayEvents>();
    const visibleDayByKey = new Map(
      renderedDayEntries.map(({ day }) => {
        const key = getCalendarDateKey(day);
        map.set(key, { allDayEvents: [], timedEvents: [] });

        return [key, day] as const;
      }),
    );

    for (const event of visibleEvents) {
      for (const dayKey of getEventDateKeys(event)) {
        const day = visibleDayByKey.get(dayKey);
        const dayEvents = map.get(dayKey);

        if (!day || !dayEvents) continue;

        if (event.isAllDay) {
          dayEvents.allDayEvents.push(event);
          continue;
        }

        const clippedEvent = clipEventToDay(event, day);
        if (clippedEvent) {
          dayEvents.timedEvents.push(clippedEvent);
        }
      }
    }

    for (const dayEvents of map.values()) {
      dayEvents.allDayEvents.sort(compareCalendarEvents);
      dayEvents.timedEvents.sort(compareCalendarEvents);
    }

    return map;
  }, [renderedDayEntries, visibleEvents]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden" onScroll={onScroll}>
        <div className="grid bg-white" style={gridStyle}>
          <div className="z-[60] h-10 border-b border-[#eeeeee] bg-white" style={WEEKDAY_HEADER_CORNER_STYLE} />

          {renderedDayEntries.map(({ day, dayIndex }) => {
            const dayKey = getCalendarDateKey(day);
            const isDayToday = dayKey === todayDayKey;
            const isDaySelected = dayKey === selectedDayKey;
            const gridColumn = getRenderedDayGridColumn(dayIndex, virtualDayRange, hasVirtualRail);

            return (
              <div key={`weekday-header-${dayKey}`} className="sticky top-0 z-50 border-b border-[#eeeeee] bg-white" style={{ gridColumn, gridRow: 1 }}>
                <CalendarDateButton isToday={isDayToday} isSelected={isDaySelected} onClick={() => onSelectDate?.(day)} className="w-full">
                  <CalendarDateContent dateLabel={format(day, GRID.WEEKDAY_DATE_FORMAT)} weekdayLabel={format(day, GRID.WEEKDAY_DAY_FORMAT, { locale: ja })} isToday={isDayToday} isSelected={isDaySelected} layout="weekday-date" />
                </CalendarDateButton>
              </div>
            );
          })}

          <div className="z-[60] flex min-h-7 justify-end border-b border-r border-t border-[#eeeeee] bg-white pr-2 pt-1 text-[10px] font-medium text-[rgba(60,60,67,0.45)]" style={WEEKDAY_ALL_DAY_LABEL_STYLE}>
            終日
          </div>

          {renderedDayEntries.map(({ day, dayIndex }) => {
            const dayKey = getCalendarDateKey(day);
            const dayEvents = eventsByDay.get(dayKey) ?? EMPTY_WEEKDAY_DAY_EVENTS;
            const events = dayEvents.allDayEvents;
            const visibleChips = events.slice(0, MAX_ALL_DAY_VISIBLE_CHIPS);
            const overflowCount = events.length - visibleChips.length;
            const gridColumn = getRenderedDayGridColumn(dayIndex, virtualDayRange, hasVirtualRail);

            return (
              <div key={`weekday-all-day-${dayKey}`} className={cn("sticky top-10 z-40 min-h-7 border-b border-r border-t border-[#eeeeee] bg-white px-1 py-1", dayIndex === totalDayCount - 1 && "border-r-0")} style={{ gridColumn, gridRow: 2 }}>
                <div className="flex flex-col gap-1">
                  {visibleChips.map((event) => <AllDayEventChip key={event.id} event={event} />)}

                  {overflowCount > 0 ? (
                    <div className="text-[11px] font-medium text-[#8f929c]">
                      +{overflowCount}件
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          <div className="z-30 overflow-visible border-r border-[#eeeeee] bg-white shadow-[1px_0_0_rgba(255,255,255,0.88)_inset]" style={WEEKDAY_TIME_COLUMN_STYLE}>
            {HOURS.map((hour) => <div key={hour} className="bg-white" style={{ height: "var(--calendar-hour-row-height)" }} />)}
            <div aria-hidden="true" className="bg-white" style={{ height: BOTTOM_BOUNDARY_LABEL_SPACER_HEIGHT }} />

            {HOUR_BOUNDARY_LABELS.map((hour) => (
              <span key={`weekday-hour-label-${hour}`} className="pointer-events-none absolute inset-x-0 z-20 flex h-6 -translate-y-1/2 select-none items-center justify-end rounded-md bg-white px-1 text-[12px] font-medium tabular-nums text-[#8f929c]" style={{ top: `calc(${hour} * var(--calendar-hour-row-height))` }}>
                {createHourLabel(hour)}
              </span>
            ))}

            <CurrentTimeLabel currentMinutes={currentMinutes} />
          </div>

          {renderedDayEntries.map(({ day, dayIndex }) => {
            const dayKey = getCalendarDateKey(day);
            const isDayToday = dayKey === todayDayKey;
            const dayEvents = eventsByDay.get(dayKey) ?? EMPTY_WEEKDAY_DAY_EVENTS;
            const eventsForDay = dayEvents.timedEvents;
            const layout = computeEventLayout(eventsForDay.map((event) => toLayoutEvent(event.id, new Date(event.startsAt), getEventDurationMinutes(event), C.MIN_LAYOUT_MINUTES)));
            const gridColumn = getRenderedDayGridColumn(dayIndex, virtualDayRange, hasVirtualRail);

            return (
              <div key={`weekday-body-${dayKey}`} className={cn("relative border-r border-[#eeeeee] bg-white", dayIndex === totalDayCount - 1 && "border-r-0")} style={{ contain: "layout paint style", gridColumn, gridRow: 3 }}>
                {HOURS.map((hour) => <div key={`${dayKey}-${hour}`} className="border-b border-[#eeeeee] bg-white" style={{ height: "var(--calendar-hour-row-height)" }} />)}
                <div aria-hidden="true" className="bg-white" style={{ height: BOTTOM_BOUNDARY_LABEL_SPACER_HEIGHT }} />

                {(isTodayVisible ? isDayToday : true) && <CurrentTimeIndicator isToday={isDayToday} currentMinutes={currentMinutes} />}

                {eventsForDay.map((event) => {
                  const pos = layout.get(event.id) ?? { left: 0, width: 1 };

                  return (
                    <div key={event.id} className="absolute px-[2px]" style={{ ...calculateEventPositionStyle(event), left: `${pos.left * 100}%`, width: `${pos.width * 100}%` }}>
                      <CalendarEventChipWeekday event={event} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CalendarWeekDayGrid = memo(CalendarWeekDayGridComponent, areCalendarWeekDayGridPropsEqual);

CalendarWeekDayGrid.displayName = "CalendarWeekDayGrid";

export { CalendarWeekDayGrid };
