import { compareCalendarEvents, eventOverlapsDay } from "@/features/calendar/calendarEventRange";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import { cn } from "@/lib/utils";

export type DayDetailPanelProps = {
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  isOpen: boolean;
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
  const allDayEvents = events
    .filter((event) => event.isAllDay && eventOverlapsDay(event, selectedDate))
    .sort(compareCalendarEvents);

  if (!isOpen) {
    return <aside className="w-0 shrink-0 overflow-hidden" aria-hidden="true" />;
  }

  return (
    <aside className="flex w-[269px] shrink-0 flex-col overflow-hidden bg-transparent">
      <div className="min-h-0 flex-1 overflow-y-auto">
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
              {allDayEvents.map((event) => (
                <AllDayChip key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
