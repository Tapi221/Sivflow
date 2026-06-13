import { format } from "date-fns";
import type { CSSProperties } from "react";
import { eventChipDesign } from "@/chip/eventchip/eventChipDesign.generated";
import { HoverMonthEventTooltip } from "@/chip/toolchip/HoverMonthEventTooltip";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

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

const CHIP_BASE_CLASS_NAME = "flex w-full min-w-0 items-center overflow-hidden text-left shadow-none";
const CHIP_TITLE_CLASS_NAME = "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold leading-none tracking-[-0.01em]";
const CHIP_TIME_CLASS_NAME = "ml-1 shrink-0 overflow-hidden whitespace-nowrap font-semibold leading-none tabular-nums opacity-80";

const createCalendarEventChipMonthStyle = (backgroundColor: string, accentColor: string, textColor: string, showTimeLabel: boolean, isAllDay: boolean): CalendarEventChipMonthStyle => ({
  "--calendar-event-chip-accent": accentColor,
  "--calendar-event-chip-bg": backgroundColor,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
  background: backgroundColor,
  borderLeft: `${eventChipDesign.month.borderWidthPx}px solid ${accentColor}`,
  borderRadius: eventChipDesign.month.radiusPx,
  color: textColor,
  height: eventChipDesign.month.heightPx,
  paddingBottom: showTimeLabel ? eventChipDesign.month.paddingYWithTimePx : eventChipDesign.month.paddingYCompactPx,
  paddingLeft: eventChipDesign.month.paddingLeftPx,
  paddingRight: eventChipDesign.month.paddingRightPx,
  paddingTop: showTimeLabel ? eventChipDesign.month.paddingYWithTimePx : eventChipDesign.month.paddingYCompactPx,
  transform: !showTimeLabel && isAllDay ? `translateY(${eventChipDesign.month.allDayOffsetPx}px)` : undefined,
});
const createTitleStyle = (): CSSProperties => ({
  fontSize: eventChipDesign.month.titleFontSizePx,
});
const createTimeStyle = (): CSSProperties => ({
  fontSize: eventChipDesign.month.timeFontSizePx,
});
const getTimeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return "終日";

  return `${format(event.startsAt, "H:mm")} ~ ${format(event.endsAt, "H:mm")}`;
};

const CalendarEventChipMonth = ({ event, showTimeLabel = true, tooltipDisabled = false }: CalendarEventChipMonthProps) => {
  const tokens = generateColorTokens(event.accentColor);
  const titleLabel = event.title ?? "Untitled";
  const timeLabel = getTimeLabel(event);
  const chipStyle = createCalendarEventChipMonthStyle(tokens.bg, tokens.border, tokens.text, showTimeLabel, event.isAllDay);

  return (
    <HoverMonthEventTooltip title={titleLabel} timeLabel={timeLabel} accentColor={tokens.border} className="h-full min-h-0 w-full min-w-0" disabled={tooltipDisabled}>
      <div data-calendar-event-chip="month" className={CHIP_BASE_CLASS_NAME} style={chipStyle}>
        <span className={CHIP_TITLE_CLASS_NAME} style={createTitleStyle()}>{titleLabel}</span>
        {showTimeLabel ? <span className={CHIP_TIME_CLASS_NAME} style={createTimeStyle()}>{timeLabel}</span> : null}
      </div>
    </HoverMonthEventTooltip>
  );
};

CalendarEventChipMonth.displayName = "CalendarEventChipMonth";

export { CalendarEventChipMonth };
