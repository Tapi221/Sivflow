import type { CSSProperties } from "react";
import { format } from "date-fns";
import { HoverEventTooltip } from "@/chip/toolchip/HoverEventTooltip";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type CalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  tooltipDisabled?: boolean;
};

type CalendarEventChipWeekdayStyle = CSSProperties & {
  "--calendar-event-chip-accent": string;
  "--calendar-event-chip-bg": string;
  WebkitPrintColorAdjust: "exact";
  printColorAdjust: "exact";
};

const CHIP_ROOT_CLASS = "relative isolate h-full min-h-0 w-full";
const CHIP_LINE_MASK_CLASS = "pointer-events-none absolute inset-0 rounded-md bg-white";
const CHIP_BASE_CLASS = "relative z-10 flex h-full min-h-0 w-full items-center gap-1 overflow-hidden rounded-md py-[1px] pl-1 pr-[1px] text-left";
const CHIP_TITLE_CLASS = "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium leading-[17px]";
const CHIP_TIME_CLASS = "shrink-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold leading-[16px] tabular-nums opacity-80";
const GOOGLE_CALENDAR_EVENT_EDIT_URL = "https://calendar.google.com/calendar/u/0/r/eventedit";

const createCalendarEventChipWeekdayStyle = (backgroundColor: string, accentColor: string, textColor: string): CalendarEventChipWeekdayStyle => ({
  "--calendar-event-chip-accent": accentColor,
  "--calendar-event-chip-bg": backgroundColor,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
  background: backgroundColor,
  borderLeft: `3px solid ${accentColor}`,
  color: textColor,
});

const encodeBase64Url = (value: string): string | null => {
  if (typeof window === "undefined") return null;

  const bytes = new TextEncoder().encode(value);
  let binaryValue = "";

  for (const byte of bytes) {
    binaryValue += String.fromCharCode(byte);
  }

  return window.btoa(binaryValue).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const createGoogleCalendarEventEditUrl = (event: GoogleCalendarEvent): string | null => {
  const eventId = event.externalId ?? event.id;
  if (!eventId || !event.calendarId) return null;

  const encodedEventPayload = encodeBase64Url(`${eventId} ${event.calendarId}`);
  if (!encodedEventPayload) return null;

  return `${GOOGLE_CALENDAR_EVENT_EDIT_URL}?eid=${encodedEventPayload}`;
};

const CalendarEventChipWeekday = ({ event, tooltipDisabled = false }: CalendarEventChipWeekdayProps) => {
  const tokens = generateColorTokens(event.accentColor);
  const startsAt = event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt);
  const endsAt = event.endsAt instanceof Date ? event.endsAt : new Date(event.endsAt ?? event.startsAt);
  const timeLabel = event.isAllDay ? "終日" : `${format(startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;
  const titleLabel = event.title || "Untitled";
  const chipStyle = createCalendarEventChipWeekdayStyle(tokens.bg, tokens.border, tokens.text);
  const editUrl = createGoogleCalendarEventEditUrl(event);
  const handleEdit = editUrl ? () => { window.open(editUrl, "_blank", "noopener,noreferrer"); } : undefined;

  return (
    <HoverEventTooltip title={titleLabel} subtitle={timeLabel} accentColor={tokens.border} className="h-full min-h-0 w-full" disabled={tooltipDisabled} onEdit={handleEdit}>
      <div className={CHIP_ROOT_CLASS}>
        <div aria-hidden="true" className={CHIP_LINE_MASK_CLASS} />
        <div data-calendar-event-chip="weekday" className={CHIP_BASE_CLASS} style={chipStyle}>
          <span className={CHIP_TITLE_CLASS}>{titleLabel}</span>
          <span className={CHIP_TIME_CLASS}>{timeLabel}</span>
        </div>
      </div>
    </HoverEventTooltip>
  );
};

CalendarEventChipWeekday.displayName = "CalendarEventChipWeekday";

export { CalendarEventChipWeekday };
