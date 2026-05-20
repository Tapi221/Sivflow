import { format } from "date-fns";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/ui/calendar.color-tokens";

type CalendarEventChipMonthProps = {
  event: GoogleCalendarEvent;
};

export const CalendarEventChipMonth = ({
  event,
}: CalendarEventChipMonthProps) => {
  const tokens = generateColorTokens(event.accentColor);
  const timeLabel = format(event.startsAt, "H:mm");

  return (
    <div
      className="flex items-center gap-1 truncate rounded px-1 py-[2px] text-[11px] font-medium leading-[1.3]"
      style={{
        background: tokens.bg,
        borderLeft: `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={`${timeLabel} ${event.title}`}
    >
      <span className="shrink-0 tabular-nums opacity-80">{timeLabel}</span>

      <span className="truncate">{event.title}</span>
    </div>
  );
};
