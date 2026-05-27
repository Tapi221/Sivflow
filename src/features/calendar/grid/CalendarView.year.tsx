import { memo, useMemo } from "react";
import type { CSSProperties } from "react";
import { addDays, eachMonthOfInterval, endOfYear, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { useDateFnsLocale, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

type CalendarYearViewProps = {
  yearDate: Date;
  selectedDate: Date;
  visibleEvents?: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
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

const YEAR_MONTH_GRID_DAY_COUNT = 42;
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

const buildMonthDays = (
  monthDate: Date,
  eventsByDay: Map<string, CalendarYearDayEvents>,
): CalendarYearDay[] => {
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
}: CalendarYearViewProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const today = useMemo(() => new Date(), []);

  const eventsByDay = useMemo(
    () => buildEventsByDay(visibleEvents),
    [visibleEvents],
  );

  const months = useMemo<CalendarYearMonth[]>(() => {
    return eachMonthOfInterval({
      start: startOfYear(yearDate),
      end: endOfYear(yearDate),
    }).map((monthDate) => {
      const days = buildMonthDays(monthDate, eventsByDay);

      return {
        key: format(monthDate, "yyyy-MM"),
        date: monthDate,
        label: format(monthDate, t.dateFnsLocaleKey === "ja" ? "M月" : "MMM", { locale: dateFnsLocale }),
        weeks: chunkMonthWeeks(days),
      };
    });
  }, [dateFnsLocale, eventsByDay, t.dateFnsLocaleKey, yearDate]);

  return (
    <div className="calendar-year-view min-h-0 flex-1 overflow-y-auto bg-[rgba(255,255,255,0.92)] px-4 pb-5 pt-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {months.map((month) => (
          <section
            key={month.key}
            className="min-w-0 bg-white px-4 pb-3 pt-3"
            aria-label={month.label}
          >
            <h2 className="mb-3 text-[15px] font-semibold leading-none tracking-[-0.01em] text-[#1c1c1e]">
              {month.label}
            </h2>

            <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold leading-none text-[#8e8e93]">
              {t.miniCalendarWeekdays.map((weekday, index) => (
                <div key={`${weekday}-${index}`} className="flex h-5 items-center justify-center">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-[12px] leading-none">
              {month.weeks.flat().map((day) => {
                const selected = isSameDay(day.date, selectedDate);
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
                      "mx-auto flex h-6 w-8 items-center justify-center rounded-[4px] font-medium transition-colors duration-150 ease-out",
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
    </div>
  );
};

const CalendarYearView = memo(CalendarYearViewComponent);

CalendarYearView.displayName = "CalendarYearView";

export { CalendarYearView };
