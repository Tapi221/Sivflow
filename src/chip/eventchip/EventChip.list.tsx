import type { CSSProperties } from "react";
import { memo, useMemo } from "react";
import { format } from "date-fns";
import { LIST_EVENT_CHIP_HEIGHT_PX, LIST_EVENT_ROW_HEIGHT_PX } from "./EventChip.list.placement";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type CalendarEventChipListProps = {
  event: GoogleCalendarEvent;
};

const ALL_DAY_LABEL = "終日";
const LIST_EVENT_ROW_CLASS_NAME = "grid grid-cols-[54px_26px_minmax(0,1fr)] items-stretch";
const LIST_EVENT_ROW_STYLE: CSSProperties = { height: LIST_EVENT_ROW_HEIGHT_PX };
const LIST_EVENT_START_TIME_CLASS_NAME = "pt-2.5 text-right text-[11px] font-medium leading-none tabular-nums text-[rgba(60,60,67,0.62)]";
const LIST_EVENT_LINE_CLASS_NAME = "absolute top-0 -bottom-1.5 left-1/2 w-px -translate-x-1/2 bg-[#eceff3]";
const LIST_EVENT_DOT_CLASS_NAME = "relative mt-2 h-2 w-2 rounded-full border-2 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]";
const LIST_EVENT_CHIP_CLASS_NAME = "w-full overflow-hidden rounded-md py-0.5 pl-1.5 pr-2 text-left";
const LIST_EVENT_CHIP_STYLE: CSSProperties = { height: LIST_EVENT_CHIP_HEIGHT_PX };
const LIST_EVENT_TIME_CLASS_NAME = "overflow-hidden whitespace-nowrap text-[11px] font-semibold tabular-nums opacity-80";
const LIST_EVENT_TITLE_CLASS_NAME = "mt-0.5 line-clamp-2 overflow-hidden whitespace-normal break-words text-[11px] font-semibold leading-snug tracking-[-0.01em]";
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

const getEventTimeRangeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return ALL_DAY_LABEL;

  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt ?? event.startsAt);
  const durationLabel = getEventDurationLabel(startsAt, endsAt);

  return `${format(startsAt, "H:mm")} - ${format(endsAt, "H:mm")}（${durationLabel}）`;
};

const createEventChipStyle = (tokens: ReturnType<typeof generateColorTokens>, isAllDay: boolean): CSSProperties => ({
  ...LIST_EVENT_CHIP_STYLE,
  background: tokens.bg,
  borderLeft: isAllDay ? undefined : `3px solid ${tokens.border}`,
  color: tokens.text,
});

const CalendarEventChipListComponent = ({ event }: CalendarEventChipListProps) => {
  const tokens = useMemo(() => generateColorTokens(event.accentColor), [event.accentColor]);
  const title = getEventTitle(event);
  const startLabel = getEventStartTimeLabel(event);
  const timeRangeLabel = getEventTimeRangeLabel(event);
  const chipStyle = useMemo(() => createEventChipStyle(tokens, event.isAllDay), [event.isAllDay, tokens]);

  return (
    <div className={LIST_EVENT_ROW_CLASS_NAME} style={LIST_EVENT_ROW_STYLE}>
      <div className={LIST_EVENT_START_TIME_CLASS_NAME}>{startLabel}</div>

      <div className="relative flex justify-center">
        <span className={LIST_EVENT_LINE_CLASS_NAME} aria-hidden="true" />
        <span className={LIST_EVENT_DOT_CLASS_NAME} style={{ borderColor: tokens.border, boxShadow: `0 0 0 3px ${tokens.bg}` }} aria-hidden="true" />
      </div>

      <div className={LIST_EVENT_CHIP_CLASS_NAME} style={chipStyle}>
        <div className={LIST_EVENT_TIME_CLASS_NAME}>{timeRangeLabel}</div>
        <div className={LIST_EVENT_TITLE_CLASS_NAME}>{title}</div>
      </div>
    </div>
  );
};

const CalendarEventChipList = memo(CalendarEventChipListComponent);

CalendarEventChipList.displayName = "CalendarEventChipList";

export { CalendarEventChipList };
