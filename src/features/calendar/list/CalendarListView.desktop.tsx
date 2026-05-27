import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { addDays, format, getDaysInMonth, isSameDay, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { HoverEventTooltip } from "@/chip/toolchip/HoverEventTooltip";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarListViewProps = {
  days: Date[];
  events: GoogleCalendarEvent[];
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
  className?: string;
};

type CalendarListDay = {
  date: Date;
  dateKey: string;
  events: GoogleCalendarEvent[];
  isSelected: boolean;
  isToday: boolean;
};

type CalendarListDaySectionProps = {
  day: CalendarListDay;
  selectedDayRef?: (node: HTMLDivElement | null) => void;
  onSelectDate?: (date: Date) => void;
};

type CalendarListEventRowProps = {
  dateKey: string;
  event: GoogleCalendarEvent;
};

type CalendarListEventCardStyle = CSSProperties & {
  borderLeftColor: string;
};

const ALL_DAY_LABEL = "終日";
const EMPTY_DAY_LABEL = "この日の予定はありません";
const EMPTY_MONTH_LABEL = "この期間の予定はありません";
const SELECTED_DAY_SCROLL_BLOCK: ScrollLogicalPosition = "nearest";

const buildMonthDays = (date: Date): Date[] => {
  const monthStart = startOfMonth(date);

  return Array.from({ length: getDaysInMonth(monthStart) }, (_, index) =>
    addDays(monthStart, index),
  );
};

const getEventTitle = (event: GoogleCalendarEvent): string =>
  event.title.trim() || "Untitled";

const getEventStartTimeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return ALL_DAY_LABEL;

  return format(new Date(event.startsAt), "H:mm");
};

const getEventTimeRangeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return ALL_DAY_LABEL;

  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);

  return `${format(startsAt, "H:mm")} - ${format(endsAt, "H:mm")}`;
};

const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt).getTime();

  return `${dateKey}:${event.id}:${startsAt}:${endsAt}`;
};

const createEventCardStyle = (event: GoogleCalendarEvent): CalendarListEventCardStyle => {
  const tokens = generateColorTokens(event.accentColor);

  return {
    background: `linear-gradient(90deg, ${tokens.bg} 0%, rgba(255, 255, 255, 0.88) 100%)`,
    borderColor: tokens.bg,
    borderLeftColor: tokens.border,
    color: tokens.text,
  };
};

const buildListDays = (
  days: Date[],
  events: GoogleCalendarEvent[],
  selectedDate: Date,
): CalendarListDay[] => {
  const resolvedDays = days.length > 0 ? days : buildMonthDays(selectedDate);
  const today = new Date();
  const eventsByDay = new Map<string, GoogleCalendarEvent[]>();
  const dayByKey = new Map<string, Date>();

  resolvedDays.forEach((day) => {
    const dayKey = getCalendarDateKey(day);

    dayByKey.set(dayKey, day);
    eventsByDay.set(dayKey, []);
  });

  events.forEach((event) => {
    getEventDateKeys(event).forEach((dayKey) => {
      const day = dayByKey.get(dayKey);
      const dayEvents = eventsByDay.get(dayKey);

      if (!day || !dayEvents) return;

      if (event.isAllDay) {
        dayEvents.push(event);
        return;
      }

      const clippedEvent = clipEventToDay(event, day);
      if (clippedEvent) {
        dayEvents.push(clippedEvent);
      }
    });
  });

  return resolvedDays.map((date) => {
    const dateKey = getCalendarDateKey(date);
    const dayEvents = eventsByDay.get(dateKey) ?? [];

    dayEvents.sort(compareCalendarEvents);

    return {
      date,
      dateKey,
      events: dayEvents,
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
    };
  });
};

const getVisibleListDays = (days: CalendarListDay[]): CalendarListDay[] => {
  const hasEvents = days.some((day) => day.events.length > 0);

  if (!hasEvents) {
    return days.filter((day) => day.isSelected).slice(0, 1) || days.slice(0, 1);
  }

  return days.filter((day) => day.events.length > 0 || day.isSelected);
};

const CalendarListEventRow = ({ dateKey, event }: CalendarListEventRowProps) => {
  const tokens = generateColorTokens(event.accentColor);
  const title = getEventTitle(event);
  const startLabel = getEventStartTimeLabel(event);
  const timeRangeLabel = getEventTimeRangeLabel(event);
  const cardStyle = createEventCardStyle(event);

  return (
    <div className="grid min-h-[70px] grid-cols-[72px_34px_minmax(0,1fr)] items-stretch">
      <div className="pt-4 text-right text-[13px] font-medium leading-none tabular-nums text-[rgba(60,60,67,0.68)]">
        {startLabel}
      </div>

      <div className="relative flex justify-center">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#eceff3]" aria-hidden="true" />
        <span
          className="relative mt-[14px] h-3.5 w-3.5 rounded-full border-2 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
          style={{ borderColor: tokens.border, boxShadow: `0 0 0 4px ${tokens.bg}` }}
          aria-hidden="true"
        />
      </div>

      <HoverEventTooltip title={title} subtitle={timeRangeLabel} accentColor={tokens.border} className="min-w-0 pb-2">
        <div
          className="min-h-[66px] w-full rounded-[14px] border border-l-[3px] px-4 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_28px_rgba(15,23,42,0.04)] transition duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_36px_rgba(15,23,42,0.07)]"
          style={cardStyle}
        >
          <div className="text-[12px] font-semibold leading-none tabular-nums">
            {timeRangeLabel}
          </div>
          <div className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-[#1c1c1e]">
            {title}
          </div>
        </div>
      </HoverEventTooltip>
    </div>
  );
};

const EmptyDayCard = ({ isMonthEmpty }: { isMonthEmpty: boolean }) => (
  <div className="grid min-h-[70px] grid-cols-[72px_34px_minmax(0,1fr)] items-stretch">
    <div className="pt-4 text-right text-[13px] font-medium leading-none text-[rgba(60,60,67,0.38)]">
      —
    </div>
    <div className="relative flex justify-center">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#eef1f4]" aria-hidden="true" />
      <span className="relative mt-[14px] h-3.5 w-3.5 rounded-full border-2 border-[#d9dee6] bg-white" aria-hidden="true" />
    </div>
    <div className="flex min-h-[66px] items-center rounded-[14px] border border-dashed border-[#dfe3e8] bg-[#fbfcfd] px-4 text-[13px] font-medium text-[#8f929c]">
      {isMonthEmpty ? EMPTY_MONTH_LABEL : EMPTY_DAY_LABEL}
    </div>
  </div>
);

const CalendarListDaySection = ({
  day,
  selectedDayRef,
  onSelectDate,
}: CalendarListDaySectionProps) => {
  const isMonthEmpty = day.events.length === 0;

  return (
    <section
      ref={day.isSelected ? selectedDayRef : undefined}
      className="grid grid-cols-[78px_minmax(0,1fr)] gap-3"
      aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}
    >
      <button
        type="button"
        className={cn(
          "group mt-1 flex h-10 items-baseline justify-end gap-1 rounded-[12px] pr-1 text-right transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25",
          day.isSelected && "text-[#1c1c1e]",
        )}
        onClick={() => onSelectDate?.(day.date)}
      >
        <span className={cn("text-[19px] font-bold leading-none tracking-[-0.03em]", day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]")}>{format(day.date, "d")}</span>
        <span className="text-[12px] font-semibold leading-none text-[rgba(60,60,67,0.58)]">{format(day.date, "EEE", { locale: ja })}</span>
      </button>

      <div className="space-y-2.5">
        {day.events.length > 0 ? (
          day.events.map((event) => (
            <CalendarListEventRow
              key={getEventInstanceKey(day.dateKey, event)}
              dateKey={day.dateKey}
              event={event}
            />
          ))
        ) : (
          <EmptyDayCard isMonthEmpty={isMonthEmpty} />
        )}
      </div>
    </section>
  );
};

const CalendarListViewComponent = ({
  days,
  events,
  selectedDate,
  onSelectDate,
  className,
}: CalendarListViewProps) => {
  const selectedDayElementRef = useRef<HTMLDivElement | null>(null);
  const listDays = useMemo(
    () => buildListDays(days, events, selectedDate),
    [days, events, selectedDate],
  );
  const visibleDays = useMemo(() => getVisibleListDays(listDays), [listDays]);
  const isMonthEmpty = listDays.every((day) => day.events.length === 0);

  useEffect(() => {
    selectedDayElementRef.current?.scrollIntoView({ block: SELECTED_DAY_SCROLL_BLOCK });
  }, [selectedDate, visibleDays]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-white", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4 scrollbar-hidden">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-8">
          {visibleDays.map((day) => (
            <CalendarListDaySection
              key={day.dateKey}
              day={day}
              selectedDayRef={day.isSelected ? (node) => {
                selectedDayElementRef.current = node;
              } : undefined}
              onSelectDate={onSelectDate}
            />
          ))}

          {visibleDays.length === 0 ? (
            <EmptyDayCard isMonthEmpty={isMonthEmpty} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const CalendarListView = memo(CalendarListViewComponent);

CalendarListView.displayName = "CalendarListView";

export { CalendarListView };
