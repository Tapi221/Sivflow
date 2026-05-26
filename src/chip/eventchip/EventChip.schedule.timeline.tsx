import { memo, useMemo } from "react";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

const FALLBACK_TIMELINE_EVENT_COLOR = "#8f929c";

type CalendarEventChipTimelineProps = {
  event: GoogleCalendarEvent;
};

export const CalendarEventChipTimeline = memo(({
  event,
}: CalendarEventChipTimelineProps) => {
  const tokens = useMemo(
    () => generateColorTokens(event.accentColor || FALLBACK_TIMELINE_EVENT_COLOR),
    [event.accentColor],
  );
  const title = event.title || "Untitled";

  return (
    <div
      className="flex h-full items-center gap-1 overflow-hidden rounded-md border-l-[3px] px-1.5 text-[11px] font-semibold leading-none"
      style={{ background: tokens.bg, borderLeftColor: tokens.border, color: tokens.text }}
      title={title}
    >
      <span className="truncate">{title}</span>
    </div>
  );
});

CalendarEventChipTimeline.displayName = "CalendarEventChipTimeline";
