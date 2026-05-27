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
  selectedDayRef?: (node: HTMLElement | null) => void;
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
const EMPTY_DAY_LABEL = "予定なし";
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
    background: `linear-gradient(90deg, ${tokens.bg} 0%, rgba(255, 255, 255, 0.9) 100%)`,
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

const CalendarListEventRow = ({ dateKey, event }: CalendarListEventRowProps) => {
  const tokens = generateColorTokens(event.accentColor);
  const title = getEventTitle(event);
  const startLabel = getEventStartTimeLabel(event);
  const timeRangeLabel = getEventTimeRangeLabel(event);
  const cardStyle = createEventCardStyle(event);

  return (
    <div className="grid min-h-[50px] grid-cols-[54px_26px_minmax(0,1fr)] items-stretch">
      <div className="pt-3 text-right text-[12px] font-medium leading-none tabular-nums text-[rgba(60,60,67,0.62)]">
        {startLabel}
      </div>

      <div className="relative flex justify-center">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#eceff3]" aria-hidden="true" />
        <span
          className="relative mt-[9px] h-2.5 w-2.5 rounded-full border-2 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]"
          style={{ borderColor: tokens.border, boxShadow: `0 0 0 3px ${tokens.bg}` }}
          aria-hidden="true"
        />
      </div>

      <HoverEventTooltip title={title} subtitle={timeRangeLabel} accentColor={tokens.border} className="min-w-0 pb-1.5">
        <div
          className="min-h-[46px] w-full rounded-[11px] border border-l-[3px] px-3 py-2 text-left shadow-[0_1px_2px_rgba(15,23,42,0.025),0_8px_18px_rgba(15,23,42,0.035)] transition duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_1px_2px_rgba(15,23,42,0.035),0_12px_24px_rgba(15,23,42,0.055)]"
          style={cardStyle}
        >
          <div className="text-[11px] font-semibold leading-none tabular-nums">
            {timeRangeLabel}
          </div>
          <div className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[#1c1c1e]">
            {title}
          </div>
        </div>
      </HoverEventTooltip>
    </div>
  );
};

const EmptyDayCard = ({ isMonthEmpty }: { isMonthEmpty: boolean }) => (
  <div className="grid min-h-[38px] grid-cols-[54px_26px_minmax(0,1fr)] items-stretch">
    <div className="pt-2.5 text-right text-[12px] font-medium leading-none text-[#b3b3b3]">
      —
    </div>
    <div className="relative flex justify-center">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#dedede]" aria-hidden="true" />
      <span className="relative mt-[8px] h-2 w-2 rounded-full border border-[#dedede] bg-white" aria-hidden="true" />
    </div>
    <div className="flex min-h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">
      {isMonthEmpty ? EMPTY_MONTH_LABEL : EMPTY_DAY_LABEL}
    </div>
  </div>
);

const CalendarListDaySection = ({
  day,
  selectedDayRef,
  onSelectDate,
}: CalendarListDaySectionProps) => {
  return (
    <section
      ref={day.isSelected ? selectedDayRef : undefined}
      className="grid grid-cols-[58px_minmax(0,1fr)] gap-2"
      aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}
    >
      <button
        type="button"
        className={cn(
          "group mt-0.5 flex h-8 items-baseline justify-end gap-1 rounded-[10px] pr-0.5 text-right transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25",
          day.isSelected && "text-[#1c1c1e]",
        )}
        onClick={() => onSelectDate?.(day.date)}
      >
        <span className={cn("text-[16px] font-bold leading-none tracking-[-0.03em]", day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]")}>{format(day.date, "d")}</span>
        <span className="text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]">{format(day.date, "EEE", { locale: ja })}</span>
      </button>

      <div className="space-y-1.5">
        {day.events.length > 0 ? (
          day.events.map((event) => (
            <CalendarListEventRow
              key={getEventInstanceKey(day.dateKey, event)}
              dateKey={day.dateKey}
              event={event}
            />
          ))
        ) : (
          <EmptyDayCard isMonthEmpty={false} />
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
  const selectedDayElementRef = useRef<HTMLElement | null>(null);
  const listDays = useMemo(
    () => buildListDays(days, events, selectedDate),
    [days, events, selectedDate],
  );
  const isMonthEmpty = listDays.every((day) => day.events.length === 0);

  useEffect(() => {
    selectedDayElementRef.current?.scrollIntoView({ block: SELECTED_DAY_SCROLL_BLOCK });
  }, [selectedDate, listDays]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-white", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 scrollbar-hidden">
        <div className="mx-auto flex w-full max-w-[940px] flex-col gap-2">
          {listDays.map((day) => (
            <CalendarListDaySection
              key={day.dateKey}
              day={day}
              selectedDayRef={day.isSelected ? (node) => {
                selectedDayElementRef.current = node;
              } : undefined}
              onSelectDate={onSelectDate}
            />
          ))}

          {listDays.length === 0 ? (
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
