import { useLayoutEffect, useRef } from "react";
import { format } from "date-fns";
import { clipEventToDay, compareCalendarEvents, eventOverlapsDay } from "@/features/calendar/calendarEventRange";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import { GridCalendarDayDetailDesktop, HOUR_ROW_HEIGHT } from "@/features/calendar/grid/Grid.calendar.daydetail.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import { cn } from "@/lib/utils";

type ScrollTarget = {
  hour: number;
  key: string;
};

export type DayDetailPanelProps = {
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  isOpen: boolean;
};

const DEFAULT_SCROLL_HOUR = 0;
const FIRST_EVENT_SCROLL_PADDING_HOURS = 1;
const MAX_SCROLL_HOUR = 23;

const createEventScrollKey = (event: GoogleCalendarEvent): string =>
  `${event.calendarId}:${event.id}:${event.startsAt.getTime()}:${event.endsAt.getTime()}`;

const getScrollHourForEvent = (event: GoogleCalendarEvent): number => {
  const startHour = event.startsAt.getHours();

  return Math.max(
    DEFAULT_SCROLL_HOUR,
    Math.min(MAX_SCROLL_HOUR, startHour - FIRST_EVENT_SCROLL_PADDING_HOURS),
  );
};

const getScrollTarget = (
  events: GoogleCalendarEvent[],
  selectedDate: Date,
): ScrollTarget => {
  const firstTimedEvent = events
    .map((event) => clipEventToDay(event, selectedDate))
    .filter((event): event is GoogleCalendarEvent => Boolean(event))
    .sort(compareCalendarEvents)[0];

  if (!firstTimedEvent) {
    return { hour: DEFAULT_SCROLL_HOUR, key: "none" };
  }

  return {
    hour: getScrollHourForEvent(firstTimedEvent),
    key: createEventScrollKey(firstTimedEvent),
  };
};

const AllDayChip = ({ event }: { event: GoogleCalendarEvent }) => {
  const tokens = generateColorTokens(event.accentColor);

  return (
    <div
      className={cn(eventChipAllDayClass, "truncate")}
      style={{ background: tokens.bg, color: tokens.text }}
    >
      {event.title || "Untitled"}
    </div>
  );
};

export const DayDetailPanel = ({
  selectedDate,
  events,
  isOpen,
}: DayDetailPanelProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevScrollTargetKeyRef = useRef("");
  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const allDayEvents = events
    .filter((e) => e.isAllDay && eventOverlapsDay(e, selectedDate))
    .sort(compareCalendarEvents);
  const timedEvents = events
    .filter((e) => !e.isAllDay && eventOverlapsDay(e, selectedDate))
    .sort(compareCalendarEvents);
  const scrollTarget = getScrollTarget(timedEvents, selectedDate);
  const scrollTargetKey = `${dateKey}:${scrollTarget.key}`;

  useLayoutEffect(() => {
    if (!isOpen) return;

    const el = scrollRef.current;

    if (!el || prevScrollTargetKeyRef.current === scrollTargetKey) return;

    prevScrollTargetKeyRef.current = scrollTargetKey;
    el.scrollTop = scrollTarget.hour * HOUR_ROW_HEIGHT;
  }, [isOpen, scrollTarget.hour, scrollTargetKey]);

  if (!isOpen) {
    return <aside className="w-0 shrink-0 overflow-hidden" aria-hidden="true" />;
  }

  return (
    <aside className="flex w-[269px] shrink-0 flex-col overflow-hidden bg-transparent">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-[48px] border-b border-[#f5f5f5]">
          <div className="relative w-12 shrink-0 bg-transparent">
            <span
              className="absolute right-2 top-1/2 flex h-5 -translate-y-1/2 select-none items-center justify-end rounded-md bg-transparent px-1 text-[11px] font-medium leading-[1.3] tracking-[-0.01em]"
              style={{ color: "#b3b3b3" }}
            >
              終日
            </span>
          </div>

          <div className="flex-1 px-2 py-2">
            <div className="flex flex-col gap-1">
              {allDayEvents.map((ev) => (
                <AllDayChip key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        </div>

        <GridCalendarDayDetailDesktop
          date={selectedDate}
          events={timedEvents}
        />
      </div>
    </aside>
  );
};
