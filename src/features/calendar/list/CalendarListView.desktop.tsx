import { memo, useEffect, useMemo, useRef } from "react";
import { addDays, format, getDaysInMonth, isSameDay, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.schedule.list";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
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

const EMPTY_DAY_LABEL = "予定なし";
const EMPTY_MONTH_LABEL = "この期間の予定はありません";
const SELECTED_DAY_SCROLL_BLOCK: ScrollLogicalPosition = "nearest";

const buildMonthDays = (date: Date): Date[] => {
  const monthStart = startOfMonth(date);

  return Array.from({ length: getDaysInMonth(monthStart) }, (_, index) =>
    addDays(monthStart, index),
  );
};

const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt).getTime();

  return `${dateKey}:${event.id}:${startsAt}:${endsAt}`;
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
            <CalendarEventChipList
              key={getEventInstanceKey(day.dateKey, event)}
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