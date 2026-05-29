import { memo, useMemo } from "react";
import type { CSSProperties } from "react";
import { addDays, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import { getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@shared/i18n/useT";

type MiniCalendarSectionProps = {
  monthDate: Date;
  selectedDate: Date;
  visibleEvents: GoogleCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

type MiniCalendarDayEventColors = Map<string, string[]>;

const MINI_CALENDAR_DIVIDER_CLASS_NAME = "mt-2 h-px w-full shrink-0 bg-[#eeeeee]";
const MINI_CALENDAR_MONTH_LABEL_CLASS_NAME = "mb-1 flex h-7 max-w-full items-center justify-start overflow-hidden pl-2.5 pr-0.5 text-left text-[14px] font-semibold leading-none tracking-[-0.01em] text-[#2f2f2f]";
const MINI_CALENDAR_MONTH_LABEL_TEXT_CLASS_NAME = "block min-w-0 truncate";
const MINI_CALENDAR_WEEKDAY_CLASS_NAME = "flex h-6 items-center justify-center text-[11px] font-semibold leading-none tracking-[0.03em] text-[#8e8e93]";
const MINI_CALENDAR_DAY_BUTTON_CLASS_NAME = "relative mx-auto flex h-8 w-7 items-start justify-center rounded-full pt-[1px] transition-all duration-150 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7cc]";
const MINI_CALENDAR_EVENT_DOTS_CLASS_NAME = "pointer-events-none absolute bottom-[1px] left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-[2px]";
const MINI_CALENDAR_EVENT_DOT_CLASS_NAME = "h-[3px] w-[3px] rounded-full";
const MINI_CALENDAR_EVENT_DOT_MAX_COUNT = 4;
const EMPTY_VISIBLE_EVENTS: readonly GoogleCalendarEvent[] = [];
const EMPTY_EVENT_COLORS: readonly string[] = [];

const getMiniCalendarVisibleEvents = (
  visibleEvents: unknown,
): readonly GoogleCalendarEvent[] => {
  return Array.isArray(visibleEvents) ? visibleEvents : EMPTY_VISIBLE_EVENTS;
};

const getMiniCalendarDayKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

const buildMiniCalendarDays = (
  monthDate: Date,
  selectedDate: Date,
): MiniCalendarDay[] => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const today = startOfDay(new Date());

  return Array.from({ length: C.MINI_CALENDAR_CELL_COUNT }, (_, index) => {
    const date = addDays(gridStart, index);

    return {
      date,
      dayNumber: format(date, "d"),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
      isRangeStart: false,
      isRangeEnd: false,
      isInSelectedRange: false,
    };
  });
};

const addMiniCalendarDayEventColor = (
  dayColors: MiniCalendarDayEventColors,
  dayKey: string,
  color: string,
) => {
  const colors = dayColors.get(dayKey);

  if (colors) {
    if (colors.length < MINI_CALENDAR_EVENT_DOT_MAX_COUNT) {
      colors.push(color);
    }

    return;
  }

  dayColors.set(dayKey, [color]);
};

const buildMiniCalendarDayEventColors = (
  visibleEvents: readonly GoogleCalendarEvent[],
): MiniCalendarDayEventColors => {
  const dayColors: MiniCalendarDayEventColors = new Map();

  for (const event of visibleEvents) {
    const color = generateColorTokens(event.accentColor).border;

    for (const dayKey of getEventDateKeys(event)) {
      addMiniCalendarDayEventColor(dayColors, dayKey, color);
    }
  }

  return dayColors;
};

const getMiniCalendarDayEventColors = (
  day: MiniCalendarDay,
  dayEventColors: MiniCalendarDayEventColors,
): readonly string[] => {
  return dayEventColors.get(getMiniCalendarDayKey(day.date)) ?? EMPTY_EVENT_COLORS;
};

const getMiniCalendarEventDotStyle = (color: string): CSSProperties => ({
  backgroundColor: color,
});

const isSameDayValue = (left: Date, right: Date): boolean => {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
};

const isSameMonthValue = (left: Date, right: Date): boolean => {
  return startOfMonth(left).getTime() === startOfMonth(right).getTime();
};

const MiniCalendarSectionBase = ({
  monthDate,
  selectedDate,
  visibleEvents,
  onSelectDate,
}: MiniCalendarSectionProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const monthLabel = useMemo(
    () => format(monthDate, monthLabelFormat, { locale: dateFnsLocale }),
    [dateFnsLocale, monthDate, monthLabelFormat],
  );
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );
  const miniCalendarVisibleEvents = useMemo(
    () => getMiniCalendarVisibleEvents(visibleEvents),
    [visibleEvents],
  );
  const dayEventColors = useMemo(
    () => buildMiniCalendarDayEventColors(miniCalendarVisibleEvents),
    [miniCalendarVisibleEvents],
  );

  return (
    <>
      <section className="flex w-full shrink-0 flex-col overflow-hidden pb-2.5 pl-0 pr-2.5 pt-2.5">
        <div className={MINI_CALENDAR_MONTH_LABEL_CLASS_NAME} aria-live="polite">
          <span className={MINI_CALENDAR_MONTH_LABEL_TEXT_CLASS_NAME}>{monthLabel}</span>
        </div>

        <div className="grid grid-cols-7 px-0.5">
          {t.miniCalendarWeekdays.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className={MINI_CALENDAR_WEEKDAY_CLASS_NAME}
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0 px-0.5">
          {miniCalendarDays.map((day) => {
            const eventColors = getMiniCalendarDayEventColors(day, dayEventColors);
            const hasEvents = eventColors.length > 0;

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={cn(MINI_CALENDAR_DAY_BUTTON_CLASS_NAME, "hover:bg-[#f7f7f7]")}
                data-mini-calendar-event-day={hasEvents ? "true" : undefined}
              >
                <CalendarDayNumberCircle
                  isToday={day.isToday}
                  isSelected={day.isSelected}
                  isCurrentMonth={day.isCurrentMonth}
                  className="relative z-10"
                >
                  {day.dayNumber}
                </CalendarDayNumberCircle>

                {hasEvents && (
                  <span aria-hidden="true" className={MINI_CALENDAR_EVENT_DOTS_CLASS_NAME}>
                    {eventColors.map((color, index) => (
                      <span
                        key={`${color}-${index}`}
                        className={MINI_CALENDAR_EVENT_DOT_CLASS_NAME}
                        style={getMiniCalendarEventDotStyle(color)}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className={MINI_CALENDAR_DIVIDER_CLASS_NAME} />
    </>
  );
};

const MiniCalendarSection = memo(MiniCalendarSectionBase, (previous, next) => {
  return (
    isSameMonthValue(previous.monthDate, next.monthDate) &&
    isSameDayValue(previous.selectedDate, next.selectedDate) &&
    previous.visibleEvents === next.visibleEvents &&
    previous.onSelectDate === next.onSelectDate
  );
});

MiniCalendarSection.displayName = "MiniCalendarSection";

export { MiniCalendarSection };
