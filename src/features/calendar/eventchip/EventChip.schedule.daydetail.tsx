import { format } from "date-fns";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { eventChipAllDayClass } from "@/features/calendar/eventchip/eventchip.allday.styles";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import { cn } from "@/lib/utils";
// ==============================================

const HOUR_ROW_HEIGHT = 48;

// ==============================================

const getStartMinutes = (
  event: GoogleCalendarEvent,
): number => {
  const d = new Date(event.startsAt);

  return (
    d.getHours() * 60 +
    d.getMinutes()
  );
};

const getDurationMinutes = (
  event: GoogleCalendarEvent,
): number => {
  const start = new Date(
    event.startsAt,
  ).getTime();

  const end = new Date(
    event.endsAt,
  ).getTime();

  const diff = end - start;

  return diff > 0
    ? Math.max(30, diff / 60000)
    : 30;
};

// ==============================================

type EventChipDayDetailProps = {
  event: GoogleCalendarEvent;
  compact?: boolean;
};

export const EventChipDayDetail = ({
  event,
  compact = false,
}: EventChipDayDetailProps) => {
  const tokens = generateColorTokens(
    event.accentColor,
  );

  const startMin =
    getStartMinutes(event);

  const durationMin =
    getDurationMinutes(event);

  const top =
    (startMin / 60) *
    HOUR_ROW_HEIGHT;

  const calculatedHeight =
    (durationMin / 60) *
    HOUR_ROW_HEIGHT;

  const startsAt =
    event.startsAt instanceof Date
      ? event.startsAt
      : new Date(event.startsAt);

  const endsAt =
    event.endsAt instanceof Date
      ? event.endsAt
      : new Date(event.endsAt);

  const timeLabel = event.isAllDay
    ? "終日"
    : `${format(startsAt, "H:mm")} ~ ${format(
      endsAt,
      "H:mm",
    )}`;

  const height = event.isAllDay
    ? undefined
    : calculatedHeight;

  return (
    <div
      className={cn(
        eventChipAllDayClass,
        event.isAllDay
          ? `
            absolute
            left-[6px]
            right-[8px]
            flex
            flex-col
            gap-0
            text-left
          `
          : `
            flex
            h-full
            w-full
            min-w-0
            flex-col
            gap-0
            text-left
          `,
        compact && "px-1 py-[1px]",
      )}
      style={{
        top: event.isAllDay ? top : undefined,
        height: event.isAllDay ? height : undefined,
        background: tokens.bg,
        borderLeft: event.isAllDay
          ? undefined
          : `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={`${event.title || "Untitled"} ${timeLabel}`}
    >
      {!compact && (
        <span className="truncate">
          {event.title || "Untitled"}
        </span>
      )}

      <span
        className="
          truncate
          tabular-nums
          opacity-80
        "
      >
        {timeLabel}
      </span>
    </div>
  );
};