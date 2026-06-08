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
  WebkitPrintColorAdjust: "exact";
  printColorAdjust: "exact";
};

const ALL_DAY_LABEL = "終日";
const MONTH_EVENT_CHIP_CLASS_NAME = "min-w-0 text-left shadow-none";
const MONTH_EVENT_CHIP_WITH_TIME_CLASS_NAME = "flex items-center gap-1";
const MONTH_EVENT_TIME_CLASS_NAME = "shrink-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold leading-[1.3] tabular-nums opacity-80";
const MONTH_EVENT_TITLE_CLASS_NAME = "block min-w-0 truncate";
const MONTH_EVENT_TITLE_WITH_TIME_CLASS_NAME = "min-w-0 truncate";

const getEventTitle = (event: GoogleCalendarEvent): string => event.title.trim() || "Untitled";

const getEventDate = (value: Date): Date => value instanceof Date ? value : new Date(value);

const getEventStartTimeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return ALL_DAY_LABEL;

  return format(getEventDate(event.startsAt), "H:mm");
};

const getEventTimeRangeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return ALL_DAY_LABEL;

  const startsAt = getEventDate(event.startsAt);
  const endsAt = getEventDate(event.endsAt ?? event.startsAt);

  return `${format(startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;
};

const createCalendarEventChipMonthStyle = (backgroundColor: string, textColor: string): CalendarEventChipMonthStyle => ({
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
  background: backgroundColor,
  color: textColor,
});

const getCalendarEventChipMonthClassName = (showTimeLabel: boolean, shouldAlignAllDayWithoutTimeLabel: boolean): string => cn(eventChipAllDayClass, MONTH_EVENT_CHIP_CLASS_NAME, showTimeLabel && MONTH_EVENT_CHIP_WITH_TIME_CLASS_NAME, shouldAlignAllDayWithoutTimeLabel && "translate-y-px");

const CalendarEventChipMonthComponent = ({ event, showTimeLabel = true, tooltipDisabled = false }: CalendarEventChipMonthProps) => {
  const tokens = useMemo(() => generateColorTokens(event.accentColor), [event.accentColor]);
  const titleLabel = getEventTitle(event);
  const visibleTimeLabel = showTimeLabel ? getEventStartTimeLabel(event) : null;
  const tooltipTimeLabel = getEventTimeRangeLabel(event);
  const chipStyle = useMemo(() => createCalendarEventChipMonthStyle(tokens.bg, tokens.text), [tokens]);
  const chipClassName = getCalendarEventChipMonthClassName(showTimeLabel, event.isAllDay && !showTimeLabel);

  return (
    <HoverMonthEventTooltip title={titleLabel} timeLabel={tooltipTimeLabel} accentColor={tokens.border} className="min-w-0 w-full" disabled={tooltipDisabled}>
      <div data-calendar-event-chip="month" className={chipClassName} style={chipStyle}>
        {visibleTimeLabel ? <span className={MONTH_EVENT_TIME_CLASS_NAME}>{visibleTimeLabel}</span> : null}
        <span className={visibleTimeLabel ? MONTH_EVENT_TITLE_WITH_TIME_CLASS_NAME : MONTH_EVENT_TITLE_CLASS_NAME}>{titleLabel}</span>
      </div>
    </HoverMonthEventTooltip>
  );
};

const CalendarEventChipMonth = memo(CalendarEventChipMonthComponent);

CalendarEventChipMonth.displayName = "CalendarEventChipMonth";

export { CalendarEventChipMonth };
