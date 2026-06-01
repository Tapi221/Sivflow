import { memo, useMemo, type CSSProperties } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipMonth } from "@/chip/eventchip/EventChip.month";
import { computeMonthEventsByDay, createMonthEventIndex, EMPTY_MONTH_DAY_EVENTS } from "@/chip/eventchip/EventChip.month.placement";
import type { CalendarMonthDayEvents } from "@/chip/eventchip/EventChip.month.placement";
import { CalendarDayNumberCircle } from "@/chip/icons/CalendarDayNumberCircle";
import * as T from "@/features/calendar/calendar.text";
import { MonthRowResizeBar } from "@/features/calendar/grid/height/MonthRowResizeBar.month.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import * as COLOR from "./grid.color.constants.desktop";
import * as GD from "./grid.layout.constants.desktop";

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
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  scrollHoverDayKey: string | null;
  setWeekRowRef: (key: string, node: HTMLDivElement | null) => void;
  onSelectDate: (date: Date) => void;
  handleResizeReset: () => void;
  handleResizeKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  handleResizePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
};

type CalendarMonthDayCellProps = {
  day: CalendarMonthGridDay;
  dayEvents: CalendarMonthDayEvents;
  isToday: boolean;
  selected: boolean;
  isScrollHovered: boolean;
  hasLeadingBorder: boolean;
  onSelectDate: (date: Date) => void;
};

type CalendarMonthWeekRowProps = {
  week: CalendarMonthGridWeek;
  eventsByDay: Map<string, CalendarMonthDayEvents>;
  selectedDayKey: string;
  todayDayKey: string;
  scrollHoverDayKey: string | null;
  monthRowHeight: number;
  setWeekRowRef: (key: string, node: HTMLDivElement | null) => void;
  onSelectDate: (date: Date) => void;
  handleResizeReset: () => void;
  handleResizeKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  handleResizePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
};

const MONTH_GRID_BORDER_STYLE: CSSProperties = { borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB };

const getDayKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

const getDayAriaLabel = (date: Date): string => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

const getMonthAnnotation = (date: Date): string | null => {
  if (date.getDate() !== 1) return null;

  return format(date, "M月", { locale: ja });
};

const weekContainsDayKey = (week: CalendarMonthGridWeek, dayKey: string | null) => dayKey !== null && week.days.some((day) => day.key === dayKey);

const isWeekAffectedByDayKeyChange = (week: CalendarMonthGridWeek, previousDayKey: string | null, nextDayKey: string | null) => previousDayKey !== nextDayKey && (weekContainsDayKey(week, previousDayKey) || weekContainsDayKey(week, nextDayKey));

const createMonthWeekRowStyle = (monthRowHeight: number): CSSProperties => ({
  ...MONTH_GRID_BORDER_STYLE,
  minHeight: monthRowHeight,
});

const CalendarMonthDayCell = memo(({ day, dayEvents, isToday, selected, isScrollHovered, hasLeadingBorder, onSelectDate }: CalendarMonthDayCellProps) => {
  const monthAnnotation = getMonthAnnotation(day.date);
  const { visibleEvents, totalCount } = dayEvents;
  const overflowCount = totalCount - visibleEvents.length;

  return (
    <div data-calendar-month-day-key={day.key} className={cn("calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-visible bg-white text-left", hasLeadingBorder && "border-l", isToday && "bg-[#f7fbff]", selected && !isToday && "bg-[#f7f7f8]", !selected && !isToday && "calendar-month-day-cell-hoverable", isScrollHovered && !selected && !isToday && "calendar-month-day-cell-scroll-hovered bg-[#fafafa]")} style={MONTH_GRID_BORDER_STYLE}> 
      <button type="button" aria-label={getDayAriaLabel(day.date)} aria-pressed={selected} className="relative h-full w-full overflow-hidden text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c7c7cc]" onClick={() => onSelectDate(day.date)}>
        <CalendarDayNumberCircle isToday={isToday} isSelected={selected} isCurrentMonth={day.isCurrentMonth} className={cn("absolute", GD.MONTH_GRID_DAY_NUMBER_POSITION_CLASS)}>
          {day.dayOfMonth}
        </CalendarDayNumberCircle>

        {monthAnnotation && (
          <span className={cn("absolute text-[12px] font-semibold text-[#8e8e93]", GD.MONTH_GRID_MONTH_ANNOTATION_POSITION_CLASS)}>
            {monthAnnotation}
          </span>
        )}

        {totalCount > 0 && (
          <div className={cn("absolute flex flex-col", GD.MONTH_GRID_EVENTS_CONTAINER_POSITION_CLASS, GD.MONTH_GRID_EVENTS_GAP_CLASS)}>
            {visibleEvents.map((event) => (
              <CalendarEventChipMonth key={event.id} event={event} />
            ))}

            {overflowCount > 0 && (
              <div className={cn("shrink-0 font-medium text-[#8f929c]", GD.MONTH_GRID_OVERFLOW_TEXT_CLASS)}>
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

const CalendarMonthWeekRow = memo(({ week, eventsByDay, selectedDayKey, todayDayKey, scrollHoverDayKey, monthRowHeight, setWeekRowRef, onSelectDate, handleResizeReset, handleResizeKeyDown, handleResizePointerDown }: CalendarMonthWeekRowProps) => {
  return (
    <div ref={(node) => setWeekRowRef(week.key, node)} data-calendar-week-key={week.key} className="calendar-month-week-row relative grid grid-cols-7 border-b" style={createMonthWeekRowStyle(monthRowHeight)}>
      {week.days.map((day, dayIndex) => {
        const selected = day.key === selectedDayKey;
        const isToday = day.key === todayDayKey;
        const isScrollHovered = day.key === scrollHoverDayKey;

        return <CalendarMonthDayCell key={day.key} day={day} dayEvents={eventsByDay.get(day.key) ?? EMPTY_MONTH_DAY_EVENTS} isToday={isToday} selected={selected} isScrollHovered={isScrollHovered} hasLeadingBorder={dayIndex > 0} onSelectDate={onSelectDate} />;
      })}

      <MonthRowResizeBar monthRowHeight={monthRowHeight} onResizeReset={handleResizeReset} onResizeKeyDown={handleResizeKeyDown} onResizePointerDown={handleResizePointerDown} />
    </div>
  );
}, (previous, next) => {
  if (previous.week !== next.week || previous.eventsByDay !== next.eventsByDay || previous.monthRowHeight !== next.monthRowHeight || previous.setWeekRowRef !== next.setWeekRowRef || previous.onSelectDate !== next.onSelectDate || previous.handleResizeReset !== next.handleResizeReset || previous.handleResizeKeyDown !== next.handleResizeKeyDown || previous.handleResizePointerDown !== next.handleResizePointerDown) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.selectedDayKey, next.selectedDayKey)) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.todayDayKey, next.todayDayKey)) return false;
  if (isWeekAffectedByDayKeyChange(previous.week, previous.scrollHoverDayKey, next.scrollHoverDayKey)) return false;
  return true;
});

CalendarMonthWeekRow.displayName = "CalendarMonthWeekRow";

const GridCalendarMonthDesktop = ({ today, selectedDate, visibleEvents, monthWeeks, monthRowHeight, topSpacerHeight, bottomSpacerHeight, scrollHoverDayKey, setWeekRowRef, onSelectDate, handleResizeReset, handleResizeKeyDown, handleResizePointerDown }: GridCalendarMonthDesktopProps) => {
  const selectedDayKey = useMemo(() => getDayKey(selectedDate), [selectedDate]);
  const todayDayKey = useMemo(() => getDayKey(today), [today]);
  const eventIndex = useMemo(() => createMonthEventIndex(visibleEvents), [visibleEvents]);
  const eventsByDay = useMemo(() => computeMonthEventsByDay({ eventIndex, monthWeeks, monthRowHeight }), [eventIndex, monthRowHeight, monthWeeks]);

  return (
    <>
      <div className={cn("sticky top-0 z-30 grid grid-cols-7 overflow-hidden border-b bg-white shadow-none", GD.MONTH_GRID_WEEKDAY_HEADER_HEIGHT_CLASS)} style={MONTH_GRID_BORDER_STYLE}>
        {T.WEEKDAY_LABELS.map((label: string) => (
          <div key={label} className="calendar-month-weekday-cell flex items-center justify-center text-[11px] leading-none font-semibold tracking-[0.03em] text-[#8e8e93]">
            {label}
          </div>
        ))}
      </div>

      <div className="calendar-month-grid bg-white">
        <div aria-hidden="true" className="calendar-month-grid-spacer" style={{ height: topSpacerHeight }} />

        {monthWeeks.map((week) => (
          <CalendarMonthWeekRow key={week.key} week={week} eventsByDay={eventsByDay} selectedDayKey={selectedDayKey} todayDayKey={todayDayKey} scrollHoverDayKey={scrollHoverDayKey} monthRowHeight={monthRowHeight} setWeekRowRef={setWeekRowRef} onSelectDate={onSelectDate} handleResizeReset={handleResizeReset} handleResizeKeyDown={handleResizeKeyDown} handleResizePointerDown={handleResizePointerDown} />
        ))}

        <div aria-hidden="true" className="calendar-month-grid-spacer" style={{ height: bottomSpacerHeight }} />
      </div>
    </>
  );
};

GridCalendarMonthDesktop.displayName = "GridCalendarMonthDesktop";

export { GridCalendarMonthDesktop };