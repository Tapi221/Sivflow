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

  // Date 化
  const startsAt =
    event.startsAt instanceof Date
      ? event.startsAt
      : new Date(event.startsAt);

  const endsAt =
    event.endsAt instanceof Date
      ? event.endsAt
      : new Date(event.endsAt ?? event.startsAt);

  const timeLabel = event.isAllDay
    ? "終日"
    : `${format(startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;

  return (
    <div
      className={[
        "flex w-full flex-col rounded-md px-1.5 py-1 text-left",
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
        <span className="truncate text-[12px] font-medium leading-snug">
          {event.title || "Untitled"}
        </span>
      )}
    </div>
  );
};