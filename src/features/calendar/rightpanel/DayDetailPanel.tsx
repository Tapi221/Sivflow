import { useLayoutEffect, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { DayDetailCreateButton } from "@/features/calendar/chip/button/AddScheduleButton.daydetail";
import { eventChipAllDayClass } from "@/features/calendar/eventchip/eventchip.allday.styles";
import { GridCalendarDayDetailDesktop, HOUR_ROW_HEIGHT } from "@/features/calendar/grid/Grid.calendar.daydetail.desktop";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import { cn } from "@/lib/utils";

const DEFAULT_SCROLL_HOUR = 0;

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

export type DayDetailPanelProps = {
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  isOpen: boolean;
};

export const DayDetailPanel = ({
  selectedDate,
  events,
  isOpen,
}: DayDetailPanelProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevDateKeyRef = useRef("");
  const dateKey = format(selectedDate, "yyyy-MM-dd");

  useLayoutEffect(() => {
    if (prevDateKeyRef.current === dateKey) return;

    prevDateKeyRef.current = dateKey;
    const el = scrollRef.current;

    if (!el) return;

    el.scrollTop = DEFAULT_SCROLL_HOUR * HOUR_ROW_HEIGHT;
  }, [dateKey]);

  const allDayEvents = events.filter(
    (e) => e.isAllDay && isSameDay(new Date(e.startsAt), selectedDate),
  );

  const timedEvents = events.filter(
    (e) => !e.isAllDay && isSameDay(new Date(e.startsAt), selectedDate),
  );

  if (!isOpen) {
    return <aside className="w-0 shrink-0 overflow-hidden" aria-hidden="true" />;
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden bg-transparent">
      <div className="px-4 pb-3 pt-2">
        <div className="flex h-6 items-center px-1">
          <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#3d4049]">
            {format(selectedDate, "yyyy年M月d日(E)", { locale: ja })}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex border-b border-[#f5f5f5]">
          <div className="flex w-16 shrink-0 justify-end pr-4 pt-[8px]">
            <span className="text-[10px] font-medium tracking-[-0.01em] text-[rgba(60,60,67,0.45)]">終日</span>
          </div>

          <div className="flex-1 px-2 py-1.5">
            <div className="flex flex-col gap-1">
              {allDayEvents.map((ev) => (
                <AllDayChip key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        </div>

        <GridCalendarDayDetailDesktop events={timedEvents} />
      </div>

      <div className="border-t border-[#f5f5f5] px-4 py-4">
        <DayDetailCreateButton />
      </div>
    </aside>
  );
};