import { createPortal } from "react-dom";
import { CalendarEventChipMonth } from "@web-renderer/chip/eventchip/EventChip.month";
import { cn } from "@web-renderer/lib/utils";
import { addDays, differenceInCalendarDays, format, isSameMonth, startOfDay } from "date-fns";
import type { CSSProperties, ReactNode } from "react";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarPrintRangeDay = {
  date: Date;
  key: string;
};
type CalendarPrintRangeViewProps = {
  titleLabel: string;
  rangeLabel: string;
  focusDate: Date;
  range: CalendarDateRange;
  events: GoogleCalendarEvent[];
};
type CalendarPrintRangeGridStyle = CSSProperties & {
  "--calendar-print-range-column-count": number;
};
type CalendarPrintDocumentPortalProps = {
  children: ReactNode;
};



const CALENDAR_PRINT_DOCUMENT_HOST_CLASS_NAME = "calendar-print-document-host";
const CALENDAR_PRINT_RANGE_MAX_COLUMNS = 7;
const CALENDAR_PRINT_RANGE_WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const CALENDAR_PRINT_RANGE_EMPTY_EVENTS: GoogleCalendarEvent[] = [];



const createPrintDateKey = (date: Date): string => format(date, "yyyy-MM-dd");
const createPrintRangeDays = (range: CalendarDateRange): CalendarPrintRangeDay[] => {
  const start = startOfDay(range.start);
  const dayCount = Math.max(1, differenceInCalendarDays(startOfDay(range.end), start) + 1);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(start, index);

    return {
      date,
      key: createPrintDateKey(date),
    };
  });
};
const createPrintGridStyle = (days: CalendarPrintRangeDay[]): CalendarPrintRangeGridStyle => ({
  "--calendar-print-range-column-count": Math.min(CALENDAR_PRINT_RANGE_MAX_COLUMNS, Math.max(1, days.length)),
});
const eventOverlapsDay = (event: GoogleCalendarEvent, date: Date): boolean => {
  const dayStart = startOfDay(date);
  const nextDayStart = addDays(dayStart, 1);

  return event.startsAt < nextDayStart && event.endsAt > dayStart;
};
const getEventsForDay = (events: GoogleCalendarEvent[], date: Date): GoogleCalendarEvent[] => {
  return events.filter((event) => eventOverlapsDay(event, date));
};



const CalendarPrintDocumentPortal = ({ children }: CalendarPrintDocumentPortalProps) => {
  if (typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div className={CALENDAR_PRINT_DOCUMENT_HOST_CLASS_NAME} aria-hidden="true" data-calendar-print-document="">
      {children}
    </div>,
    document.body,
  );
};
const CalendarPrintRangeView = ({ titleLabel, rangeLabel, focusDate, range, events }: CalendarPrintRangeViewProps) => {
  const days = createPrintRangeDays(range);
  const gridStyle = createPrintGridStyle(days);

  return (
    <CalendarPrintDocumentPortal>
      <section className="calendar-print-range-view">
        <div className="calendar-print-range-header">
          <h1 className="calendar-print-range-title">{titleLabel}</h1>
          <p className="calendar-print-range-subtitle">{rangeLabel}</p>
        </div>
        <div className="calendar-print-range-grid" style={gridStyle}>
          {days.map((day) => {
            const dayEvents = getEventsForDay(events, day.date);
            const isOutsideFocusMonth = !isSameMonth(day.date, focusDate);

            return (
              <article key={day.key} className={cn("calendar-print-range-day", isOutsideFocusMonth && "calendar-print-range-day-outside")}>
                <div className="calendar-print-range-day-heading">
                  <span className="calendar-print-range-day-number">{format(day.date, "d")}</span>
                  <span className="calendar-print-range-weekday">{CALENDAR_PRINT_RANGE_WEEKDAY_LABELS[day.date.getDay()]}</span>
                </div>
                <div className="calendar-print-range-events">
                  {(dayEvents.length > 0 ? dayEvents : CALENDAR_PRINT_RANGE_EMPTY_EVENTS).map((event) => (
                    <CalendarEventChipMonth key={event.id} event={event} tooltipDisabled />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </CalendarPrintDocumentPortal>
  );
};



export { CalendarPrintRangeView };
