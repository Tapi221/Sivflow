import { format } from "date-fns";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { eventChipAllDayClass } from "@/features/calendar/eventchip/eventchip.allday.styles";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import { cn } from "@/lib/utils";

type CalendarEventChipMonthProps = {
  event: GoogleCalendarEvent;
};

export const CalendarEventChipMonth = ({
  event,
}: CalendarEventChipMonthProps) => {
  const tokens = generateColorTokens(
    event.accentColor,
  );

  const isAllDay = event.isAllDay;

  const timeLabel = isAllDay
    ? "終日"
    : format(event.startsAt, "H:mm");

  return (
    <div
      className={cn(
        eventChipAllDayClass,
        `
          flex
          items-center
          gap-1
          truncate
        `,
      )}
      style={{
        background: tokens.bg,
        borderLeft: isAllDay
          ? undefined
          : `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={`${timeLabel} ${event.title}`}
    >
      <span
        className="
          shrink-0
          tabular-nums
          opacity-80
        "
      >
        {timeLabel}
      </span>

      <span className="truncate">
        {event.title}
      </span>
    </div>
  );
};