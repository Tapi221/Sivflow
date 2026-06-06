import type { CSSProperties } from "react";
import { memo, useMemo } from "react";
import { format } from "date-fns";
import { LIST_ALL_DAY_EVENT_CHIP_HEIGHT_PX, LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX, LIST_EVENT_CHIP_HEIGHT_PX, LIST_EVENT_ROW_HEIGHT_PX } from "./EventChip.list.placement";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarEventChipListProps = {
  event: GoogleCalendarEvent;
};

const ALL_DAY_LABEL = "終日";
const LIST_EVENT_ROW_CLASS_NAME = "grid grid-cols-[54px_26px_minmax(0,1fr)] items-stretch";
const LIST_EVENT_START_TIME_CLASS_NAME = "justify-self-end bg-white px-1 pt-2.5 text-right text-[11px] font-medium tabular-nums text-[var(--calendar-time-label-color)]";
const LIST_EVENT_LINE_CLASS_NAME = "absolute top-0 -bottom-1.5 left-1/2 w-px -translate-x-1/2 bg-[#eceff3]";
const LIST_EVENT_DOT_CLASS_NAME = "relative mt-2 h-2 w-2 rounded-full border-2 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]";
const LIST_EVENT_CHIP_CLASS_NAME = "w-full overflow-hidden rounded-md py-0.5 pl-1.5 pr-2 text-left";
const LIST_ALL_DAY_EVENT_CHIP_CLASS_NAME = "flex items-center py-0 pl-1.5 pr-2";
const LIST_EVENT_TIME_CLASS_NAME = "overflow-hidden whitespace-nowrap text-[11px] font-semibold tabular-nums opacity-80";
const LIST_EVENT_TITLE_CLASS_NAME = "mt-[0.5px] line-clamp-2 overflow-hidden whitespace-normal break-words text-[11px] font-semibold leading-snug tracking-[-0.01em]";
const LIST_ALL_DAY_EVENT_TITLE_CLASS_NAME = "mt-0 line-clamp-1 whitespace-nowrap leading-none";
const MINUTE_IN_MS = 60_000;

const getEventTitle = (event: GoogleCalendarEvent): string => event.title.trim() || "Untitled";

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

const createEventRowStyle = (isAllDay: boolean): CSSProperties => ({
  height: isAllDay ? LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX : LIST_EVENT_ROW_HEIGHT_PX,
});

const createEventChipStyle = (tokens: ReturnType<typeof generateColorTokens>, isAllDay: boolean): CSSProperties => ({
  height: isAllDay ? LIST_ALL_DAY_EVENT_CHIP_HEIGHT_PX : LIST_EVENT_CHIP_HEIGHT_PX,
  background: tokens.bg,
  borderLeft: isAllDay ? undefined : `3px solid ${tokens.border}`,
  color: tokens.text,
});

const CalendarEventChipListComponent = ({ event }: CalendarEventChipListProps) => {
  const tokens = useMemo(() => generateColorTokens(event.accentColor), [event.accentColor]);
  const title = getEventTitle(event);
  const startLabel = getEventStartTimeLabel(event);
  const timeRangeLabel = getEventTimeRangeLabel(event);
  const rowStyle = useMemo(() => createEventRowStyle(event.isAllDay), [event.isAllDay]);
  const chipStyle = useMemo(() => createEventChipStyle(tokens, event.isAllDay), [event.isAllDay, tokens]);

  return (
    <div className={LIST_EVENT_ROW_CLASS_NAME} style={rowStyle}>
      <div className={LIST_EVENT_START_TIME_CLASS_NAME}>{startLabel}</div>

      <div className="relative flex justify-center">
        <span className={LIST_EVENT_LINE_CLASS_NAME} aria-hidden="true" />
        <span className={LIST_EVENT_DOT_CLASS_NAME} style={{ borderColor: tokens.border, boxShadow: `0 0 0 3px ${tokens.bg}` }} aria-hidden="true" />
      </div>

      <div className={cn(LIST_EVENT_CHIP_CLASS_NAME, event.isAllDay && LIST_ALL_DAY_EVENT_CHIP_CLASS_NAME)} style={chipStyle}>
        {timeRangeLabel ? <div className={LIST_EVENT_TIME_CLASS_NAME}>{timeRangeLabel}</div> : null}
        <div className={cn(LIST_EVENT_TITLE_CLASS_NAME, event.isAllDay && LIST_ALL_DAY_EVENT_TITLE_CLASS_NAME)}>{title}</div>
      </div>
    </div>
  );
};

const CalendarEventChipList = memo(CalendarEventChipListComponent);

CalendarEventChipList.displayName = "CalendarEventChipList";

export { CalendarEventChipList };
