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
        `
          rounded-[13px]
          border
          shadow-[0_2px_8px_rgba(0,0,0,0.05)]
          backdrop-blur-xl
        `,
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
        borderColor: tokens.border,
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
          text-[10px]
          font-medium
          leading-tight
          tracking-[-0.01em]
          tabular-nums
          opacity-75
        "
      >
        {timeLabel}
      </span>

      {!compact && (
        <span className="truncate text-[11px] font-semibold leading-tight tracking-[-0.01em]">
          {event.title || "Untitled"}
        </span>
      )}
    </div>
  );
};