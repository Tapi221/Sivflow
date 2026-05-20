import { format } from "date-fns";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { eventChipAllDayClass } from "@/features/calendar/eventchip/eventchip.allday.styles";
import { generateColorTokens } from "@/features/calendar/ui/calendar.color-tokens";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────

const HOUR_ROW_HEIGHT = 40;

// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────

export const EventChipDayDetail = ({
  event,
}: {
  event: GoogleCalendarEvent;
}) => {
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
        `
          absolute
          left-[6px]
          right-[8px]
          flex
          flex-col
          gap-0
          text-left
        `,
      )}
      style={{
        top,
        height,
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
          truncate
          tabular-nums
          opacity-80
        "
      >
        {timeLabel}
      </span>

      {!event.isAllDay && (
        <span className="truncate">
          {event.title || "Untitled"}
        </span>
      )}

      {event.isAllDay && (
        <span className="truncate">
          {event.title || "Untitled"}
        </span>
      )}
    </div>
  );
};