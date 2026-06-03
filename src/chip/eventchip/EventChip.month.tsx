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
  showTimeLabel?: boolean;
  tooltipDisabled?: boolean;
};

type CalendarEventChipMonthStyle = CSSProperties & {
  "--calendar-event-chip-accent": string;
  "--calendar-event-chip-bg": string;
  WebkitPrintColorAdjust: "exact";
  printColorAdjust: "exact";
};

const createCalendarEventChipMonthStyle = (backgroundColor: string, accentColor: string, textColor: string, borderLeft?: string): CalendarEventChipMonthStyle => ({
  "--calendar-event-chip-accent": accentColor,
  "--calendar-event-chip-bg": backgroundColor,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
  background: backgroundColor,
  borderLeft,
  color: textColor,
});

const CalendarEventChipMonth = memo(({ event, showTimeLabel = true, tooltipDisabled = false }: CalendarEventChipMonthProps) => {
  const tokens = useMemo(() => generateColorTokens(event.accentColor), [event.accentColor]);

  const timeLabel = useMemo(() => {
    return event.isAllDay ? "終日" : format(event.startsAt, "H:mm");
  }, [event.isAllDay, event.startsAt]);

  const titleLabel = event.title || "Untitled";
  const chipBorderLeft = event.isAllDay ? undefined : `3px solid ${tokens.border}`;
  const chipStyle = useMemo(() => createCalendarEventChipMonthStyle(tokens.bg, tokens.border, tokens.text, chipBorderLeft), [chipBorderLeft, tokens.bg, tokens.border, tokens.text]);

  return (
    <HoverMonthEventTooltip title={titleLabel} timeLabel={showTimeLabel ? timeLabel : null} accentColor={tokens.border} className="w-full min-w-0" disabled={tooltipDisabled}>
      <div data-calendar-event-chip="month" className={cn(eventChipAllDayClass, "calendar-event-chip-month flex w-full min-w-0 items-center gap-1", !event.isAllDay && "calendar-event-chip-month-timed")} style={chipStyle}>
        {showTimeLabel && <span className="shrink-0 tabular-nums opacity-80">{timeLabel}</span>}

        <span className="event-chip-month-title min-w-0 flex-1 overflow-hidden whitespace-nowrap">{titleLabel}</span>
      </div>
    </HoverMonthEventTooltip>
  );
});

CalendarEventChipMonth.displayName = "CalendarEventChipMonth";

export { CalendarEventChipMonth };
