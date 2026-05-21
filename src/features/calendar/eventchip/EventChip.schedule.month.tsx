import { memo, useMemo } from "react";
import { format } from "date-fns";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { eventChipAllDayClass } from "@/features/calendar/eventchip/eventchip.allday.styles";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import { cn } from "@/lib/utils";

type CalendarEventChipMonthProps = {
  event: GoogleCalendarEvent;
};

export const CalendarEventChipMonth = memo(({
  event,
}: CalendarEventChipMonthProps) => {
  const tokens = useMemo(
    () => generateColorTokens(event.accentColor),
    [event.accentColor],
  );

  const timeLabel = useMemo(() => {
    return event.isAllDay
      ? "終日"
      : format(event.startsAt, "H:mm");
  }, [event.isAllDay, event.startsAt]);

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
        borderLeft: event.isAllDay
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
});

CalendarEventChipMonth.displayName = "CalendarEventChipMonth";
