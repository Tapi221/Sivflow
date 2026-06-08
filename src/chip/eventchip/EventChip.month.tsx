import type { CSSProperties } from "react";
import { format } from "date-fns";
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

const CHIP_BASE_CLASS_NAME = "flex h-[18.3px] w-full min-w-0 items-center overflow-hidden rounded-[4px] border-l-[3px] pl-[3px] pr-[2px] text-left shadow-none";
const CHIP_COMPACT_PADDING_CLASS_NAME = "pt-[2px] pb-[2px]";
const CHIP_TIME_PADDING_CLASS_NAME = "pt-[1px] pb-[1px]";
const CHIP_ALL_DAY_COMPACT_OFFSET_CLASS_NAME = "translate-y-px";
const CHIP_TITLE_CLASS_NAME = "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold leading-none tracking-[-0.01em]";
const CHIP_TIME_CLASS_NAME = "ml-1 shrink-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold leading-none tabular-nums opacity-80";

const createCalendarEventChipMonthStyle = (backgroundColor: string, accentColor: string, textColor: string): CalendarEventChipMonthStyle => ({
  "--calendar-event-chip-accent": accentColor,
  "--calendar-event-chip-bg": backgroundColor,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
  background: backgroundColor,
  borderLeftColor: accentColor,
  color: textColor,
});

const getTimeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return "終日";

  return `${format(event.startsAt, "H:mm")} ~ ${format(event.endsAt, "H:mm")}`;
};

const getChipClassName = (showTimeLabel: boolean, isAllDay: boolean): string => cn(CHIP_BASE_CLASS_NAME, showTimeLabel ? CHIP_TIME_PADDING_CLASS_NAME : CHIP_COMPACT_PADDING_CLASS_NAME, !showTimeLabel && isAllDay ? CHIP_ALL_DAY_COMPACT_OFFSET_CLASS_NAME : null);

const CalendarEventChipMonth = ({ event, showTimeLabel = true, tooltipDisabled = false }: CalendarEventChipMonthProps) => {
  const tokens = generateColorTokens(event.accentColor);
  const titleLabel = event.title || "Untitled";
  const timeLabel = getTimeLabel(event);
  const chipStyle = createCalendarEventChipMonthStyle(tokens.bg, tokens.border, tokens.text);

  return (
    <HoverMonthEventTooltip title={titleLabel} timeLabel={timeLabel} accentColor={tokens.border} className="h-full min-h-0 w-full min-w-0" disabled={tooltipDisabled}>
      <div data-calendar-event-chip="month" className={getChipClassName(showTimeLabel, event.isAllDay)} style={chipStyle}>
        <span className={CHIP_TITLE_CLASS_NAME}>{titleLabel}</span>
        {showTimeLabel ? <span className={CHIP_TIME_CLASS_NAME}>{timeLabel}</span> : null}
      </div>
    </HoverMonthEventTooltip>
  );
};

CalendarEventChipMonth.displayName = "CalendarEventChipMonth";

export { CalendarEventChipMonth };
