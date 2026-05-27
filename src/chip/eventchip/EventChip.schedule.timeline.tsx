import { memo, useMemo } from "react";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

type CalendarEventChipTimelineProps = {
  event: GoogleCalendarEvent;
};

const FALLBACK_TIMELINE_EVENT_COLOR = "#8f929c";

const CalendarEventChipTimelineComponent = ({
  event,
}: CalendarEventChipTimelineProps) => {
  const tokens = useMemo(
    () => generateColorTokens(event.accentColor || FALLBACK_TIMELINE_EVENT_COLOR),
    [event.accentColor],
  );
  const title = event.title || "Untitled";

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 items-center gap-1 overflow-hidden rounded-md px-1.5 text-left text-[12px] font-medium leading-snug"
      style={{ background: tokens.bg, borderLeft: `3px solid ${tokens.border}`, color: tokens.text }}
      title={title}
    >
      <span className="min-w-0 flex-1 truncate">{title}</span>
    </div>
  );
};

const CalendarEventChipTimeline = memo(CalendarEventChipTimelineComponent);

CalendarEventChipTimeline.displayName = "CalendarEventChipTimeline";

export { CalendarEventChipTimeline };
