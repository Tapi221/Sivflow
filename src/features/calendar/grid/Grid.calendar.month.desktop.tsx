import { memo, useMemo } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import { CalendarEventChipMonth } from "@/features/calendar/eventchip/EventChip.schedule.month";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import * as GD from "@/features/calendar/grid/grid.layout.constants.desktop";

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
  maxVisibleChips: number;
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

type CalendarMonthDayCellProps = {
  day: CalendarMonthGridDay;
  events: GoogleCalendarEvent[];
  isLastColumn: boolean;
  isToday: boolean;
  selected: boolean;
  maxVisibleChips: number;
  onSelectDate: (date: Date) => void;
};

const CalendarMonthDayCell = memo(({
  day,
  events,
  isLastColumn,
  isToday,
  selected,
  maxVisibleChips,
  onSelectDate,
}: CalendarMonthDayCellProps) => {
  const monthAnnotation = getMonthAnnotation(day.date);

  const shouldShowOverflow = events.length > maxVisibleChips;
  const visibleChipCount = shouldShowOverflow
    ? Math.max(0, maxVisibleChips - 1)
    : maxVisibleChips;

  const visibleChips = events.slice(
    0,
    visibleChipCount,
  );

  const overflowCount =
    events.length - visibleChips.length;

  return (
    <div
      className={cn(
        "calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-visible border-b border-[#eef0f3] bg-white text-left",
        !isLastColumn && "border-r",
        isToday && "bg-[#f0f6ff]",
        selected && !isToday && "bg-[#f4f5f7]",
        !selected &&
          !isToday &&
          "calendar-month-day-cell-hoverable",
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
        <span
          className={cn(
            "absolute inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[length:var(--ds-layout-font-size-meta)] font-semibold tabular-nums transition-colors",
            GD.MONTH_GRID_DAY_NUMBER_POSITION_CLASS,
            isToday
              ? "bg-[#185FA5] text-white shadow-[0_7px_18px_rgba(24,95,165,0.22)]"
              : selected
                ? "bg-[#2d3039] text-white"
                : day.isCurrentMonth
                  ? "text-[#24231f]"
                  : "text-[#b0aea8]",
          )}
        >
          {day.dayOfMonth}
        </span>

        {/* 月初ラベル */}
        {monthAnnotation && (
          <span
            className={cn(
              "absolute text-[12px] font-semibold text-[#a09f98]",
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
                  "font-medium text-[#8f929c]",
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
  maxVisibleChips: number;
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
  dayKey: string,
) => week.days.some((day) => day.key === dayKey);

const isWeekAffectedByDayKeyChange = (
  week: CalendarMonthGridWeek,
  previousDayKey: string,
  nextDayKey: string,
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
  maxVisibleChips,
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
        bg-white
      "
    >
      {week.days.map((day, index) => {
        const selected = day.key === selectedDayKey;
        const isToday = day.key === todayDayKey;
        const isLastColumn = index % 7 === 6;

        return (
          <CalendarMonthDayCell
            key={day.key}
            day={day}
            events={eventsByDay.get(day.key) ?? EMPTY_EVENTS}
            isLastColumn={isLastColumn}
            isToday={isToday}
            selected={selected}
            maxVisibleChips={maxVisibleChips}
            onSelectDate={onSelectDate}
          />
        );
      })}

      {/* リサイズ */}
      <div
        role="separator"
        aria-label={T.MONTH_ROW_RESIZE_ARIA_LABEL}
        aria-orientation="horizontal"
        aria-valuemin={C.MIN_MONTH_ROW_HEIGHT}
        aria-valuemax={C.MAX_MONTH_ROW_HEIGHT}
        aria-valuenow={Number(monthRowHeight)}
        tabIndex={0}
        className="calendar-month-row-boundary-resize-handle"
        title={T.MONTH_ROW_RESIZE_TITLE}
        onClick={(e) =>
          e.stopPropagation()
        }
        onDoubleClick={handleResizeReset}
        onKeyDown={handleResizeKeyDown}
        onPointerDown={handleResizePointerDown}
      />
    </div>
  );
}, (previous, next) => {
  if (
    previous.week !== next.week ||
    previous.eventsByDay !== next.eventsByDay ||
    previous.maxVisibleChips !== next.maxVisibleChips ||
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

  return true;
});

CalendarMonthWeekRow.displayName = "CalendarMonthWeekRow";

export const GridCalendarMonthDesktop = ({
  today,
  selectedDate,
  visibleEvents,
  monthWeeks,
  maxVisibleChips,
  monthRowHeight,
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
      const startsAt =
        event.startsAt instanceof Date
          ? event.startsAt
          : new Date(event.startsAt);

      if (!Number.isFinite(startsAt.getTime())) continue;

      const eventWithDate =
        startsAt === event.startsAt
          ? event
          : {
              ...event,
              startsAt,
            };

      const dayKey = getDayKey(startsAt);
      const dayEvents = groupedEvents.get(dayKey);

      if (dayEvents) {
        dayEvents.push(eventWithDate);
      } else {
        groupedEvents.set(dayKey, [eventWithDate]);
      }
    }

    for (const dayEvents of groupedEvents.values()) {
      dayEvents.sort(
        (a, b) =>
          a.startsAt.getTime() -
          b.startsAt.getTime(),
      );
    }

    return groupedEvents;
  }, [visibleEvents]);

  return (
    <>
      {/* 曜日ヘッダー */}
      <div
        className={cn(
          "sticky top-0 z-20 grid grid-cols-7 border-b border-[#e5e7eb] bg-white",
          GD.MONTH_GRID_WEEKDAY_HEADER_HEIGHT_CLASS,
        )}
      >
        {T.WEEKDAY_LABELS.map(
          (label: string) => (
            <div
              key={label}
              className="
                flex
                items-center
                justify-center
                border-r
                border-[#eef0f3]
                text-[12px]
                leading-normal
                font-medium
                text-[#8f929c]
                last:border-r-0
              "
            >
              {label}
            </div>
          ),
        )}
      </div>

      {/* 月グリッド */}
      <div className="bg-white">
        {monthWeeks.map((week) => (
          <CalendarMonthWeekRow
            key={week.key}
            week={week}
            eventsByDay={eventsByDay}
            selectedDayKey={selectedDayKey}
            todayDayKey={todayDayKey}
            maxVisibleChips={maxVisibleChips}
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