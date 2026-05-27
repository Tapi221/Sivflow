import { format } from "date-fns";
import { HoverEventTooltip } from "@/chip/toolchip/HoverEventTooltip";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

type CalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  compact?: boolean;
};

const CalendarEventChipWeekday = ({
  event,
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
    <HoverEventTooltip
      title={titleLabel}
      subtitle={timeLabel}
      accentColor={tokens.border}
      className="h-full min-h-0 w-full"
    >
      <div
        className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md py-1 pl-1.5 pr-0 text-left"
        style={{
          background: tokens.bg,
          borderLeft: `3px solid ${tokens.border}`,
          color: tokens.text,
        }}
      >
        <span className="overflow-hidden whitespace-normal break-words text-[12px] font-medium leading-snug">
          {titleLabel}
        </span>
      </div>
    </HoverEventTooltip>
  );
};

CalendarEventChipWeekday.displayName = "CalendarEventChipWeekday";

export { CalendarEventChipWeekday };
