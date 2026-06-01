import type { CSSProperties } from "react";
import { memo, useMemo } from "react";
import { format } from "date-fns";
import { eventChipAllDayClass } from "./eventchip.allday.styles";
import { HoverMonthEventTooltip } from "@/chip/toolchip/HoverMonthEventTooltip";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarEventChipMonthProps = {
  event: GoogleCalendarEvent;
  tooltipDisabled?: boolean;
};

const CHIP_TEXT_FADE_STYLE: CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 14px), transparent 100%)",
  maskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 14px), transparent 100%)",
};

const CalendarEventChipMonth = memo(({
  event,
  tooltipDisabled = false,
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

  const titleLabel = event.title || "Untitled";

  return (
    <HoverMonthEventTooltip
      title={titleLabel}
      timeLabel={timeLabel}
      accentColor={tokens.border}
      className="w-full min-w-0"
      disabled={tooltipDisabled}
    >
      <div
        className={cn(
          eventChipAllDayClass,
          `
            flex
            w-full
            min-w-0
            items-center
            gap-1
          `,
        )}
        style={{
          background: tokens.bg,
          borderLeft: event.isAllDay
            ? undefined
            : `3px solid ${tokens.border}`,
          color: tokens.text,
        }}
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

        <span
          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
          style={CHIP_TEXT_FADE_STYLE}
        >
          {titleLabel}
        </span>
      </div>
    </HoverMonthEventTooltip>
  );
});

CalendarEventChipMonth.displayName = "CalendarEventChipMonth";

export { CalendarEventChipMonth };
