import { format } from "date-fns";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

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
    event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt);

  const endsAt =
    event.endsAt instanceof Date
      ? event.endsAt
      : new Date(event.endsAt ?? event.startsAt);

  const timeLabel = event.isAllDay
    ? "終日"
    : `${format(startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;

  const titleLabel = event.title || "Untitled";

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
      title={`${titleLabel} ${timeLabel}`}
    >
      <span className="truncate text-[12px] font-medium leading-snug">
        {titleLabel}
      </span>

      {!compact && (
        <span
          className="truncate text-[11px] font-semibold tabular-nums opacity-80"
        >
          {timeLabel}
        </span>
      )}
    </div>
  );
};
