import { useLayoutEffect, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { DayDetailCreateButton } from "@/features/calendar/chip/AddScheduleButton.daydetail";
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
      className={cn(
        eventChipAllDayClass,
        "truncate rounded-[12px] border shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
      )}
      style={{
        background: tokens.bg,
        borderColor: tokens.border,
        color: tokens.text,
      }}
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
    <aside
      className="flex w-[260px] shrink-0 flex-col overflow-hidden bg-[#f2f2f7]"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
      }}
    >
      <div className="px-4 pb-2 pt-3">
        <div className="flex h-7 items-center rounded-full bg-white/80 px-3 shadow-[0_1px_0_rgba(255,255,255,0.72),0_4px_16px_rgba(0,0,0,0.03)] backdrop-blur-xl">
          <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">
            {format(selectedDate, "yyyy年M月d日(E)", { locale: ja })}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-1 mb-1 flex rounded-[18px] border border-[rgba(60,60,67,0.12)] bg-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.035)] backdrop-blur-xl">
          <div className="flex w-16 shrink-0 justify-end pr-3 pt-[9px]">
            <span className="text-[10px] font-semibold tracking-[-0.01em] text-[rgba(60,60,67,0.48)]">終日</span>
          </div>

          <div className="flex-1 px-2 py-2">
            <div className="flex min-h-[22px] flex-col gap-1">
              {allDayEvents.map((ev) => (
                <AllDayChip key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        </div>

        <GridCalendarDayDetailDesktop events={timedEvents} />
      </div>

      <div className="border-t border-[rgba(60,60,67,0.12)] bg-[#f2f2f7]/90 px-4 py-4 backdrop-blur-xl">
        <DayDetailCreateButton />
      </div>
    </aside>
  );
};