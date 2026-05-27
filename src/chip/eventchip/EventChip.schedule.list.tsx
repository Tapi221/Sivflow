import { memo, useMemo, type CSSProperties } from "react";
import { format } from "date-fns";
import { HoverEventTooltip } from "@/chip/toolchip/HoverEventTooltip";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type CalendarEventChipListProps = {
  event: GoogleCalendarEvent;
};

type CalendarEventChipListCardStyle = CSSProperties & {
  borderLeftColor: string;
};

const ALL_DAY_LABEL = "終日";

const getEventTitle = (event: GoogleCalendarEvent): string =>
  event.title.trim() || "Untitled";

const getEventStartTimeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return ALL_DAY_LABEL;

  return format(new Date(event.startsAt), "H:mm");
};

const getEventTimeRangeLabel = (event: GoogleCalendarEvent): string => {
  if (event.isAllDay) return ALL_DAY_LABEL;

  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);

  return `${format(startsAt, "H:mm")} - ${format(endsAt, "H:mm")}`;
};

const createEventCardStyle = (
  tokens: ReturnType<typeof generateColorTokens>,
): CalendarEventChipListCardStyle => ({
  background: `linear-gradient(90deg, ${tokens.bg} 0%, rgba(255, 255, 255, 0.9) 100%)`,
  borderColor: tokens.bg,
  borderLeftColor: tokens.border,
  color: tokens.text,
});

const CalendarEventChipListComponent = ({ event }: CalendarEventChipListProps) => {
  const tokens = useMemo(
    () => generateColorTokens(event.accentColor),
    [event.accentColor],
  );
  const title = getEventTitle(event);
  const startLabel = getEventStartTimeLabel(event);
  const timeRangeLabel = getEventTimeRangeLabel(event);
  const cardStyle = useMemo(() => createEventCardStyle(tokens), [tokens]);

  return (
    <div className="grid min-h-[50px] grid-cols-[54px_26px_minmax(0,1fr)] items-stretch">
      <div className="pt-3 text-right text-[12px] font-medium leading-none tabular-nums text-[rgba(60,60,67,0.62)]">
        {startLabel}
      </div>

      <div className="relative flex justify-center">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#eceff3]" aria-hidden="true" />
        <span
          className="relative mt-[9px] h-2.5 w-2.5 rounded-full border-2 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]"
          style={{ borderColor: tokens.border, boxShadow: `0 0 0 3px ${tokens.bg}` }}
          aria-hidden="true"
        />
      </div>

      <HoverEventTooltip title={title} subtitle={timeRangeLabel} accentColor={tokens.border} className="min-w-0 pb-1.5">
        <div
          className="min-h-[46px] w-full rounded-[11px] border border-l-[3px] px-3 py-2 text-left shadow-[0_1px_2px_rgba(15,23,42,0.025),0_8px_18px_rgba(15,23,42,0.035)] transition duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_1px_2px_rgba(15,23,42,0.035),0_12px_24px_rgba(15,23,42,0.055)]"
          style={cardStyle}
        >
          <div className="text-[11px] font-semibold leading-none tabular-nums">
            {timeRangeLabel}
          </div>
          <div className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[#1c1c1e]">
            {title}
          </div>
        </div>
      </HoverEventTooltip>
    </div>
  );
};

const CalendarEventChipList = memo(CalendarEventChipListComponent);

CalendarEventChipList.displayName = "CalendarEventChipList";

export { CalendarEventChipList };