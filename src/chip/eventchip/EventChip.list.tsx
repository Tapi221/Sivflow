import { memo, useMemo } from "react";
import { format } from "date-fns";
import type { CSSProperties } from "react";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";



type CalendarEventChipListProps = {
  event: GoogleCalendarEvent;
};



const ALL_DAY_LABEL = "終日";
const LIST_EVENT_ROW_BASE_CLASS_NAME = "flex items-stretch";
const LIST_EVENT_TIMED_ROW_CLASS_NAME = "h-12";
const LIST_EVENT_ALL_DAY_ROW_CLASS_NAME = "h-10";
const LIST_EVENT_START_TIME_CLASS_NAME = "w-12 shrink-0 bg-white px-1 pt-2.5 text-right text-xs font-medium tabular-nums text-[#85827e]";
const LIST_EVENT_RAIL_CLASS_NAME = "relative flex w-8 shrink-0 justify-center";
const LIST_EVENT_LINE_CLASS_NAME = "absolute -bottom-2 left-1/2 top-0 w-px -translate-x-1/2 bg-slate-200";
const LIST_EVENT_DOT_CLASS_NAME = "relative mt-2 h-2 w-2 rounded-full border-2 bg-white shadow-sm";
const LIST_EVENT_CHIP_BASE_CLASS_NAME = "ml-2 min-w-0 flex-1 overflow-hidden rounded-2xl px-3 text-left";
const LIST_EVENT_TIMED_CHIP_CLASS_NAME = "h-11 py-1";
const LIST_ALL_DAY_EVENT_CHIP_CLASS_NAME = "flex h-8 items-center py-0";
const LIST_EVENT_TIME_CLASS_NAME = "overflow-hidden whitespace-nowrap text-xs font-semibold tabular-nums opacity-80";
const LIST_EVENT_TITLE_CLASS_NAME = "line-clamp-2 overflow-hidden whitespace-normal break-words text-xs font-semibold leading-snug tracking-tight";
const LIST_TIMED_EVENT_TITLE_CLASS_NAME = "mt-0.5";
const LIST_ALL_DAY_EVENT_TITLE_CLASS_NAME = "mt-0 line-clamp-1 whitespace-nowrap leading-none";
const MINUTE_IN_MS = 60_000;



const getEventTitle = (event: GoogleCalendarEvent): string => {
  const title = event.title.trim();
  return title === "" ? "Untitled" : title;
};
const getEventStartTimeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return ALL_DAY_LABEL;
  return format(new Date(event.startsAt), "H:mm");
};
const getEventDurationLabel = (startsAt: Date, endsAt: Date): string => {
  const totalMinutes = Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / MINUTE_IN_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
};
const getEventTimeRangeLabel = (event: GoogleCalendarEvent): string | null => {
  if (event.isAllDay) return null;
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt ?? event.startsAt);
  const durationLabel = getEventDurationLabel(startsAt, endsAt);
  return `${format(startsAt, "H:mm")} - ${format(endsAt, "H:mm")}（${durationLabel}）`;
};
const createEventChipStyle = (tokens: ReturnType<typeof generateColorTokens>): CSSProperties => ({
  background: tokens.bg,
  color: tokens.text,
});
const getEventRowClassName = (isAllDay: boolean): string =>
  cn(
    LIST_EVENT_ROW_BASE_CLASS_NAME,
    isAllDay ? LIST_EVENT_ALL_DAY_ROW_CLASS_NAME : LIST_EVENT_TIMED_ROW_CLASS_NAME,
  );
const getEventChipClassName = (isAllDay: boolean): string =>
  cn(
    LIST_EVENT_CHIP_BASE_CLASS_NAME,
    isAllDay ? LIST_ALL_DAY_EVENT_CHIP_CLASS_NAME : LIST_EVENT_TIMED_CHIP_CLASS_NAME,
  );
const getEventTitleClassName = (isAllDay: boolean): string =>
  cn(
    LIST_EVENT_TITLE_CLASS_NAME,
    isAllDay ? LIST_ALL_DAY_EVENT_TITLE_CLASS_NAME : LIST_TIMED_EVENT_TITLE_CLASS_NAME,
  );



const CalendarEventChipListComponent = ({ event }: CalendarEventChipListProps) => {
  const tokens = useMemo(() => generateColorTokens(event.accentColor), [event.accentColor]);
  const title = getEventTitle(event);
  const startLabel = getEventStartTimeLabel(event);
  const timeRangeLabel = getEventTimeRangeLabel(event);
  const chipStyle = useMemo(() => createEventChipStyle(tokens), [tokens]);
  return (
    <div className={getEventRowClassName(event.isAllDay)}>
      <div className={LIST_EVENT_START_TIME_CLASS_NAME}>{startLabel}</div>
      <div className={LIST_EVENT_RAIL_CLASS_NAME}>
        <span className={LIST_EVENT_LINE_CLASS_NAME} aria-hidden="true" />
        <span className={LIST_EVENT_DOT_CLASS_NAME} style={{ borderColor: tokens.border, boxShadow: `0 0 0 2px ${tokens.bg}` }} aria-hidden="true" />
      </div>
      <div className={getEventChipClassName(event.isAllDay)} style={chipStyle}>
        {timeRangeLabel ? <div className={LIST_EVENT_TIME_CLASS_NAME}>{timeRangeLabel}</div> : null}
        <div className={getEventTitleClassName(event.isAllDay)}>{title}</div>
      </div>
    </div>
  );
};



const CalendarEventChipList = memo(CalendarEventChipListComponent);
CalendarEventChipList.displayName = "CalendarEventChipList";

export { CalendarEventChipList };
