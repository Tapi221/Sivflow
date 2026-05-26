import { memo, useMemo } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import { compareCalendarEvents, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as T from "@/features/calendar/calendar.text";
import { CalendarEventChipMonth } from "@/chip/eventchip/EventChip.schedule.month";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { MonthRowResizeBar } from "@/features/calendar/grid/height/MonthRowResizeBar.month.desktop";
import * as GD from "@/features/calendar/grid/grid.layout.constants.desktop";
import { getVisibleMonthEventChipCount } from "@/features/calendar/grid/monthEventChipCount";
import { cn } from "@/lib/utils";

const EMPTY_EVENTS: GoogleCalendarEvent[] = [];

const getDayKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

const getDayAriaLabel = (date: Date): string => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const getMonthAnnotation = (
  date: Date,
): string | null => {
  if (date.getDate() !== 1)
    return null;

  return format(date, "M月", {
    locale: ja,
  });
};

type CalendarMonthGridDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

type CalendarMonthGridWeek = {
  key: string;
  days: CalendarMonthGridDay[];
};

type GridCalendarMonthDesktopProps = {
  today: Date;
  selectedDate: Date;
  visibleEvents: GoogleCalendarEvent[];
  monthWeeks: CalendarMonthGridWeek[];
  monthRowHeight: number;
  scrollHoverDayKey: string | null;
  setWeekRowRef: (
    key: string,
    node: HTMLDivElement | null,
  ) => void;
  onSelectDate: (
    date: Date,
  ) => void;
  handleResizeReset: () => void;
  handleResizeKeyDown: (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => void;
  handleResizePointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
  ) => void;
};

type CalendarMonthDayCellProps = {
  day: CalendarMonthGridDay;
  events: GoogleCalendarEvent[];
  isToday: boolean;
  selected: boolean;
  isScrollHovered: boolean;
  monthRowHeight: number;
  onSelectDate: (date: Date) => void;
};

const CalendarMonthDayCell = memo(({
  day,
  events,
  isToday,
  selected,
  isScrollHovered,
  monthRowHeight,
  onSelectDate,
}: CalendarMonthDayCellProps) => {
  const monthAnnotation = getMonthAnnotation(day.date);

  const visibleChipCount = getVisibleMonthEventChipCount(
    events.length,
    monthRowHeight,
  );

  const visibleChips = events.slice(
    0,
    visibleChipCount,
  );

  const overflowCount =
    events.length - visibleChips.length;

  return (
    <div
      data-calendar-month-day-key={day.key}
      className={cn(
        "calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-visible bg-white text-left",
        isToday && "bg-[#f7fbff]",
        selected && !isToday && "bg-[#f7f7f8]",
        !selected &&
          !isToday &&
          "calendar-month-day-cell-hoverable",
        isScrollHovered &&
          !selected &&
          !isToday &&
          "calendar-month-day-cell-scroll-hovered bg-[#fafafa]",
      )}
    >
      <button
        type="button"
        aria-label={getDayAriaLabel(day.date)}
        aria-pressed={selected}
        className="
          relative
          h-full
          w-full
          overflow-hidden
          text-left
          outline-none
          focus-visible:z-10
          focus-visible:ring-2
          focus-visible:ring-inset
          focus-visible:ring-ring
        "
        onClick={() =>
          onSelectDate(day.date)
        }
      >
        {/* 日付 */}
        <CalendarDayNumberCircle
          isToday={isToday}
          isSelected={selected}
          isCurrentMonth={day.isCurrentMonth}
          className={cn("absolute", GD.MONTH_GRID_DAY_NUMBER_POSITION_CLASS)}
        >
          {day.dayOfMonth}
        </CalendarDayNumberCircle>

        {/* 月初ラベル */}
        {monthAnnotation && (
          <span
            className={cn(
              "absolute text-[12px] font-semibold text-[#8e8e93]",
              GD.MONTH_GRID_MONTH_ANNOTATION_POSITION_CLASS,
            )}
          >
            {monthAnnotation}
          </span>
        )}

        {/* イベント */}
        {events.length > 0 && (
          <div
            className={cn(
              "absolute flex flex-col",
              GD.MONTH_GRID_EVENTS_CONTAINER_POSITION_CLASS,
              GD.MONTH_GRID_EVENTS_GAP_CLASS,
            )}
          >
            {visibleChips.map((event) => (
              <CalendarEventChipMonth
                key={event.id}
                event={event}
              />
            ))}

            {overflowCount > 0 && (
              <div
                className={cn(
                  "shrink-0 font-medium text-[#8f929c]",
                  GD.MONTH_GRID_OVERFLOW_TEXT_CLASS,
                )}
              >
                +{overflowCount}件
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  );
});

CalendarMonthDayCell.displayName = "CalendarMonthDayCell";

type CalendarMonthWeekRowProps = {
  week: CalendarMonthGridWeek;
  eventsByDay: Map<string, GoogleCalendarEvent[]>;
  selectedDayKey: string;
  todayDayKey: string;
  scrollHoverDayKey: string | null;
  monthRowHeight: number;
  setWeekRowRef: (
    key: string,
    node: HTMLDivElement | null,
  ) => void;
  onSelectDate: (
    date: Date,
  ) => void;
  handleResizeReset: () => void;
  handleResizeKeyDown: (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => void;
  handleResizePointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
  ) => void;
};

const weekContainsDayKey = (
  week: CalendarMonthGridWeek,
  dayKey: string | null,
) => (
  dayKey !== null && week.days.some((day) => day.key === dayKey)
);

const isWeekAffectedByDayKeyChange = (
  week: CalendarMonthGridWeek,
  previousDayKey: string | null,
  nextDayKey: string | null,
) => {
  return (
    previousDayKey !== nextDayKey &&
    (weekContainsDayKey(week, previousDayKey) ||
      weekContainsDayKey(week, nextDayKey))
  );
};

const CalendarMonthWeekRow = memo(({
  week,
  eventsByDay,
  selectedDayKey,
  todayDayKey,
  scrollHoverDayKey,
  monthRowHeight,
  setWeekRowRef,
  onSelectDate,
  handleResizeReset,
  handleResizeKeyDown,
  handleResizePointerDown,
}: CalendarMonthWeekRowProps) => {
  return (
    <div
      ref={(node) =>
        setWeekRowRef(week.key, node)
      }
      data-calendar-week-key={week.key}
      className="
        calendar-month-week-row
        relative
        grid
        grid-cols-7
        [contain-intrinsic-size:0_var(--calendar-month-row-height)]
        [content-visibility:auto]
      "
    >
      {week.days.map((day) => {
        const selected = day.key === selectedDayKey;
        const isToday = day.key === todayDayKey;
        const isScrollHovered = day.key === scrollHoverDayKey;

        return (
          <CalendarMonthDayCell
            key={day.key}
            day={day}
            events={eventsByDay.get(day.key) ?? EMPTY_EVENTS}
            isToday={isToday}
            selected={selected}
            isScrollHovered={isScrollHovered}
            monthRowHeight={monthRowHeight}
            onSelectDate={onSelectDate}
          />
        );
      })}

      <MonthRowResizeBar
        monthRowHeight={monthRowHeight}
        onResizeReset={handleResizeReset}
        onResizeKeyDown={handleResizeKeyDown}
        onResizePointerDown={handleResizePointerDown}
      />
    </div>
  );
}, (previous, next) => {
  if (
    previous.week !== next.week ||
    previous.eventsByDay !== next.eventsByDay ||
    previous.monthRowHeight !== next.monthRowHeight ||
    previous.setWeekRowRef !== next.setWeekRowRef ||
    previous.onSelectDate !== next.onSelectDate ||
    previous.handleResizeReset !== next.handleResizeReset ||
    previous.handleResizeKeyDown !== next.handleResizeKeyDown ||
    previous.handleResizePointerDown !== next.handleResizePointerDown
  ) {
    return false;
  }

  if (
    isWeekAffectedByDayKeyChange(
      previous.week,
      previous.selectedDayKey,
      next.selectedDayKey,
    )
  ) {
    return false;
  }

  if (
    isWeekAffectedByDayKeyChange(
      previous.week,
      previous.todayDayKey,
      next.todayDayKey,
    )
  ) {
    return false;
  }

  if (
    isWeekAffectedByDayKeyChange(
      previous.week,
      previous.scrollHoverDayKey,
      next.scrollHoverDayKey,
    )
  ) {
    return false;
  }

  return true;
});

CalendarMonthWeekRow.displayName = "CalendarMonthWeekRow";

export const GridCalendarMonthDesktop = ({
  today,
  selectedDate,
  visibleEvents,
  monthWeeks,
  monthRowHeight,
  scrollHoverDayKey,
  setWeekRowRef,
  onSelectDate,
  handleResizeReset,
  handleResizeKeyDown,
  handleResizePointerDown,
}: GridCalendarMonthDesktopProps) => {
  const selectedDayKey = useMemo(
    () => getDayKey(selectedDate),
    [selectedDate],
  );

  const todayDayKey = useMemo(
    () => getDayKey(today),
    [today],
  );

  const eventsByDay = useMemo(() => {
    const groupedEvents = new Map<string, GoogleCalendarEvent[]>();

    for (const event of visibleEvents) {
      for (const dayKey of getEventDateKeys(event)) {
        const dayEvents = groupedEvents.get(dayKey);

        if (dayEvents) {
          dayEvents.push(event);
        } else {
          groupedEvents.set(dayKey, [event]);
        }
      }
    }

    for (const dayEvents of groupedEvents.values()) {
      dayEvents.sort(compareCalendarEvents);
    }

    return groupedEvents;
  }, [visibleEvents]);

  return (
    <>
      {/* 曜日ヘッダー */}
      <div
        className={cn(
          "calendar-month-weekday-header sticky top-0 z-20 grid grid-cols-7 border-b border-[#eeeeee]",
          GD.MONTH_GRID_WEEKDAY_HEADER_HEIGHT_CLASS,
        )}
      >
        {T.WEEKDAY_LABELS.map(
          (label: string) => (
            <div
              key={label}
              className="
                calendar-month-weekday-cell
                flex
                items-center
                justify-center
                text-[11px]
                leading-none
                font-semibold
                tracking-[0.03em]
                text-[#8e8e93]
              "
            >
              {label}
            </div>
          ),
        )}
      </div>

      {/* 月グリッド */}
      <div className="calendar-month-grid bg-white">
        {monthWeeks.map((week) => (
          <CalendarMonthWeekRow
            key={week.key}
            week={week}
            eventsByDay={eventsByDay}
            selectedDayKey={selectedDayKey}
            todayDayKey={todayDayKey}
            scrollHoverDayKey={scrollHoverDayKey}
            monthRowHeight={monthRowHeight}
            setWeekRowRef={setWeekRowRef}
            onSelectDate={onSelectDate}
            handleResizeReset={handleResizeReset}
            handleResizeKeyDown={handleResizeKeyDown}
            handleResizePointerDown={handleResizePointerDown}
          />
        ))}
      </div>
    </>
  );
};
