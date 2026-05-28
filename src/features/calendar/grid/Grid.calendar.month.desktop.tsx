import { memo, useMemo } from "react";
import type { CSSProperties } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import { CalendarEventChipMonth } from "@/chip/eventchip/EventChip.month";
import { compareCalendarEvents, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as GD from "@/features/calendar/grid/grid.layout.constants.desktop";
import { getVisibleMonthEventChipCount } from "@/features/calendar/grid/monthEventChipCount";
import { MonthRowResizeBar } from "@/features/calendar/grid/height/MonthRowResizeBar.month.desktop";
import * as T from "@/features/calendar/calendar.text";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarMonthDayEvents = {
  visibleEvents: GoogleCalendarEvent[];
  totalCount: number;
  color: string | null;
};

type CalendarMonthEventIndex = Map<string, GoogleCalendarEvent[]>;

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
  dayEvents: CalendarMonthDayEvents;
  isToday: boolean;
  selected: boolean;
  isScrollHovered: boolean;
  onSelectDate: (date: Date) => void;
};

type CalendarMonthWeekRowProps = {
  week: CalendarMonthGridWeek;
  eventsByDay: Map<string, CalendarMonthDayEvents>;
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

const EMPTY_DAY_EVENTS: CalendarMonthDayEvents = {
  visibleEvents: [],
  totalCount: 0,
  color: null,
};

const EVENT_DAY_BACKGROUND_ALPHA = 0.16;

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

const getDayNumberStyle = (
  dayEvents: CalendarMonthDayEvents,
  selected: boolean,
): CSSProperties | undefined => {
  if (selected || !dayEvents.color) return undefined;

  return {
    backgroundColor: colorToRgba(dayEvents.color, EVENT_DAY_BACKGROUND_ALPHA),
    transition: "none",
  };
};

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

const CalendarMonthDayCell = memo(({
  day,
  dayEvents,
  isToday,
  selected,
  isScrollHovered,
  onSelectDate,
}: CalendarMonthDayCellProps) => {
  const monthAnnotation = getMonthAnnotation(day.date);
  const { visibleEvents, totalCount } = dayEvents;

  const overflowCount =
    totalCount - visibleEvents.length;

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
          focus-visible:ring-[#c7c7cc]
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
          style={getDayNumberStyle(dayEvents, selected)}
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
        {totalCount > 0 && (
          <div
            className={cn(
              "absolute flex flex-col",
              GD.MONTH_GRID_EVENTS_CONTAINER_POSITION_CLASS,
              GD.MONTH_GRID_EVENTS_GAP_CLASS,
            )}
          >
            {visibleEvents.map((event) => (
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
            dayEvents={eventsByDay.get(day.key) ?? EMPTY_DAY_EVENTS}
            isToday={isToday}
            selected={selected}
            isScrollHovered={isScrollHovered}
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

const GridCalendarMonthDesktop = ({
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

  const eventsByDayKey = useMemo<CalendarMonthEventIndex>(() => {
    const eventIndex = new Map<string, GoogleCalendarEvent[]>();

    for (const event of visibleEvents) {
      for (const dayKey of getEventDateKeys(event)) {
        const dayEvents = eventIndex.get(dayKey);

        if (dayEvents) {
          dayEvents.push(event);
        } else {
          eventIndex.set(dayKey, [event]);
        }
      }
    }

    return eventIndex;
  }, [visibleEvents]);

  const eventsByDay = useMemo(() => {
    const groupedEvents = new Map<string, CalendarMonthDayEvents>();
    const maxVisibleEventCandidates =
      getVisibleMonthEventChipCount(Number.MAX_SAFE_INTEGER, monthRowHeight) + 1;

    const insertVisibleEvent = (
      dayEvents: CalendarMonthDayEvents,
      event: GoogleCalendarEvent,
    ) => {
      if (maxVisibleEventCandidates <= 0) return;

      const visibleEvents = dayEvents.visibleEvents;
      const insertAt = visibleEvents.findIndex(
        (visibleEvent) => compareCalendarEvents(event, visibleEvent) < 0,
      );
      const boundedInsertAt =
        insertAt === -1 ? visibleEvents.length : insertAt;

      if (boundedInsertAt >= maxVisibleEventCandidates) return;

      visibleEvents.splice(boundedInsertAt, 0, event);

      if (visibleEvents.length > maxVisibleEventCandidates) {
        visibleEvents.length = maxVisibleEventCandidates;
      }
    };

    for (const week of monthWeeks) {
      for (const day of week.days) {
        const sourceEvents = eventsByDayKey.get(day.key);

        if (!sourceEvents?.length) continue;

        const dayEvents: CalendarMonthDayEvents = {
          visibleEvents: [],
          totalCount: sourceEvents.length,
          color: sourceEvents[0]?.accentColor ?? null,
        };

        for (const event of sourceEvents) {
          insertVisibleEvent(dayEvents, event);
        }

        groupedEvents.set(day.key, dayEvents);
      }
    }

    for (const dayEvents of groupedEvents.values()) {
      const visibleChipCount = getVisibleMonthEventChipCount(
        dayEvents.totalCount,
        monthRowHeight,
      );

      if (dayEvents.visibleEvents.length > visibleChipCount) {
        dayEvents.visibleEvents.length = visibleChipCount;
      }
    }

    return groupedEvents;
  }, [eventsByDayKey, monthRowHeight, monthWeeks]);

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

GridCalendarMonthDesktop.displayName = "GridCalendarMonthDesktop";

export { GridCalendarMonthDesktop };
