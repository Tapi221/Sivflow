import { format } from "date-fns";
import { memo, useMemo } from "react";
import type { CSSProperties } from "react";
import { LIST_ALL_DAY_EVENT_CHIP_HEIGHT_PX, LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX, LIST_EVENT_CHIP_HEIGHT_PX, LIST_EVENT_ROW_HEIGHT_PX } from "@/chip/eventchip/EventChip.list.placement";
import { eventChipDesign } from "@/chip/eventchip/eventChipDesign.generated";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarEventChipListProps = {
  event: GoogleCalendarEvent;
};
type EventColorTokens = ReturnType<typeof generateColorTokens>;

const ALL_DAY_LABEL = "終日";
const LIST_EVENT_ROW_CLASS_NAME = "grid grid-cols-[58px_30px_minmax(0,1fr)] items-stretch";
const LIST_EVENT_START_TIME_CLASS_NAME = "justify-self-end rounded-full bg-white/75 px-1.5 pt-2 text-right text-[11px] font-semibold tabular-nums text-[rgba(60,60,67,0.56)] shadow-[0_1px_6px_rgba(15,23,42,0.04)]";
const LIST_EVENT_LINE_CLASS_NAME = "absolute -bottom-2 top-0 left-1/2 w-px -translate-x-1/2 bg-[#e6ddd3]";
const LIST_EVENT_DOT_CLASS_NAME = "relative mt-2 h-2.5 w-2.5 rounded-full border-2 bg-[#fbf7f1] shadow-[0_0_0_4px_#fbf7f1,0_2px_8px_rgba(15,23,42,0.08)]";
const LIST_EVENT_CHIP_CLASS_NAME = "relative w-full overflow-hidden px-3.5 py-2.5 text-left";
const LIST_ALL_DAY_EVENT_CHIP_CLASS_NAME = "flex items-center py-0 pl-3.5 pr-3";
const LIST_EVENT_ACCENT_CLASS_NAME = "absolute bottom-2.5 left-2 top-2.5 w-1 rounded-full";
const LIST_EVENT_CONTENT_CLASS_NAME = "min-w-0 pl-2.5";
const LIST_ALL_DAY_EVENT_CONTENT_CLASS_NAME = "pl-2";
const LIST_EVENT_TIME_CLASS_NAME = "inline-flex max-w-full items-center rounded-full bg-white/65 px-2 py-0.5 font-semibold tabular-nums opacity-90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]";
const LIST_EVENT_TITLE_CLASS_NAME = "mt-1 line-clamp-2 overflow-hidden whitespace-normal break-words font-bold leading-snug tracking-[-0.02em]";
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
  const totalMinutes = Math.max(
    0,
    Math.round((endsAt.getTime() - startsAt.getTime()) / MINUTE_IN_MS),
  );
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
const createEventChipStyle = (tokens: EventColorTokens, isAllDay: boolean): CSSProperties => ({
  height: isAllDay ? LIST_ALL_DAY_EVENT_CHIP_HEIGHT_PX : LIST_EVENT_CHIP_HEIGHT_PX,
  background: `linear-gradient(135deg, ${tokens.bg} 0%, rgba(255,255,255,0.94) 100%)`,
  border: `1px solid ${tokens.border}`,
  borderLeft: undefined,
  borderRadius: isAllDay ? 16 : 18,
  boxShadow: "0 10px 28px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)",
  color: tokens.text,
});
const createEventAccentStyle = (tokens: EventColorTokens): CSSProperties => ({
  background: tokens.border,
});
const createEventDotStyle = (tokens: EventColorTokens): CSSProperties => ({
  borderColor: tokens.border,
});
const createEventTimeStyle = (): CSSProperties => ({
  fontSize: eventChipDesign.list.timeFontSizePx,
});
const createEventTitleStyle = (): CSSProperties => ({
  fontSize: eventChipDesign.list.titleFontSizePx + 1,
});

const CalendarEventChipListComponent = ({ event }: CalendarEventChipListProps) => {
  const tokens = useMemo(() => generateColorTokens(event.accentColor), [event.accentColor]);
  const title = getEventTitle(event);
  const startLabel = getEventStartTimeLabel(event);
  const timeRangeLabel = getEventTimeRangeLabel(event);
  const rowStyle = useMemo(() => createEventRowStyle(event.isAllDay), [event.isAllDay]);
  const chipStyle = useMemo(() => createEventChipStyle(tokens, event.isAllDay), [event.isAllDay, tokens]);
  const accentStyle = useMemo(() => createEventAccentStyle(tokens), [tokens]);
  const dotStyle = useMemo(() => createEventDotStyle(tokens), [tokens]);
  return (
    <div className={LIST_EVENT_ROW_CLASS_NAME} style={rowStyle}>
      <div className={LIST_EVENT_START_TIME_CLASS_NAME}>{startLabel}</div>
      <div className="relative flex justify-center">
        <span className={LIST_EVENT_LINE_CLASS_NAME} aria-hidden="true" />
        <span className={LIST_EVENT_DOT_CLASS_NAME} style={dotStyle} aria-hidden="true" />
      </div>
      <div className={cn(LIST_EVENT_CHIP_CLASS_NAME, event.isAllDay && LIST_ALL_DAY_EVENT_CHIP_CLASS_NAME)} style={chipStyle}>
        <span className={LIST_EVENT_ACCENT_CLASS_NAME} style={accentStyle} aria-hidden="true" />
        <div className={cn(LIST_EVENT_CONTENT_CLASS_NAME, event.isAllDay && LIST_ALL_DAY_EVENT_CONTENT_CLASS_NAME)}>
          {timeRangeLabel ? (
            <div className={LIST_EVENT_TIME_CLASS_NAME} style={createEventTimeStyle()}>
              {timeRangeLabel}
            </div>
          ) : null}
          <div className={cn(LIST_EVENT_TITLE_CLASS_NAME, event.isAllDay && LIST_ALL_DAY_EVENT_TITLE_CLASS_NAME)} style={createEventTitleStyle()}>
            {title}
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarEventChipList = memo(CalendarEventChipListComponent);
CalendarEventChipList.displayName = "CalendarEventChipList";
export { CalendarEventChipList };
