import { format } from "date-fns";
import { generateColorTokens } from "@/features/calendar/ui/calendar.color-tokens";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";

type CalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  compact?: boolean;
};

export const CalendarEventChipWeekday = ({
  event,
  compact = false,
}: CalendarEventChipWeekdayProps) => {
  const tokens = generateColorTokens(event.accentColor);

  // Google Calendar系は基本 start/end を持つ前提に寄せる
  const startsAt = event.startsAt;
  const endsAt = event.endsAt ?? startsAt;

  const timeLabel = event.isAllDay
    ? "終日"
    : `${format(startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;

  return (
    <div
      className={[
        "flex h-full w-full flex-col overflow-hidden rounded-md px-1.5 py-1 text-left",
        compact ? "gap-0.5" : "gap-1",
      ].join(" ")}
      style={{
        background: tokens.bg,
        borderLeft: `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={`${timeLabel} ${event.title}`}
    >
      <span
        className={[
          "truncate font-semibold tabular-nums opacity-80",
          compact ? "text-[10px]" : "text-[11px]",
        ].join(" ")}
      >
        {timeLabel}
      </span>

      {!compact && (
        <span
          className={[
            "truncate font-medium leading-snug",
            compact ? "text-[10px]" : "text-[12px]",
          ].join(" ")}
        >
          {event.title}
        </span>
      )}
    </div>
  );
};