import type { CSSProperties } from "react";
import { format } from "date-fns";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

type CalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  compact?: boolean;
};

const CHIP_TEXT_FADE_STYLE: CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 14px), transparent 100%)",
  maskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 14px), transparent 100%)",
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
        "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md px-1.5 py-1 text-left",
        compact ? "gap-0.5" : "gap-1",
      ].join(" ")}
      style={{
        background: tokens.bg,
        borderLeft: `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={`${titleLabel} ${timeLabel}`}
    >
      <span
        className="overflow-hidden whitespace-nowrap text-[12px] font-medium leading-snug"
        style={CHIP_TEXT_FADE_STYLE}
      >
        {titleLabel}
      </span>

      {!compact && (
        <span
          className="overflow-hidden whitespace-nowrap text-[11px] font-semibold tabular-nums opacity-80"
          style={CHIP_TEXT_FADE_STYLE}
        >
          {timeLabel}
        </span>
      )}
    </div>
  );
};