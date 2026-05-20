import { format } from "date-fns";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/ui/calendar.color-tokens";

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

  const height =
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

  return (
    <div
      className="
        absolute
        left-[6px]
        right-[8px]
        flex
        flex-col
        gap-0.5
        overflow-hidden
        rounded-md
        px-1.5
        py-1
        text-left
      "
      style={{
        top,
        height,
        background: tokens.bg,
        borderLeft: `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={`${timeLabel} ${event.title}`}
    >
      <span
        className="
          truncate
          text-[10px]
          font-semibold
          tabular-nums
          opacity-80
        "
      >
        {timeLabel}
      </span>

      <span
        className="
          truncate
          text-[11px]
          font-medium
          leading-snug
        "
      >
        {event.title || "Untitled"}
      </span>
    </div>
  );
};