import type { CSSProperties } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { eventChipAllDayClass } from "./eventchip.allday.styles";
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

const CHIP_TEXT_FADE_STYLE: CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 14px), transparent 100%)",
  maskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 14px), transparent 100%)",
};
const MOBILE_WEB_MEDIA_QUERY = "(max-width: 767px)";

const getIsMobileWeb = (): boolean => {
  if (typeof window === "undefined") return false;

  return window.matchMedia(MOBILE_WEB_MEDIA_QUERY).matches;
};

const createCalendarEventChipMonthStyle = (backgroundColor: string, accentColor: string, textColor: string, borderLeft?: string): CalendarEventChipMonthStyle => ({
  "--calendar-event-chip-accent": accentColor,
  "--calendar-event-chip-bg": backgroundColor,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
  background: backgroundColor,
  borderLeft,
  color: textColor,
});

const useIsMobileWeb = (): boolean => {
  const [isMobileWeb, setIsMobileWeb] = useState(getIsMobileWeb);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(MOBILE_WEB_MEDIA_QUERY);
    const handleChange = () => setIsMobileWeb(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobileWeb;
};

const CalendarEventChipMonth = memo(({
  event,
  showTimeLabel = true,
  tooltipDisabled = false,
}: CalendarEventChipMonthProps) => {
  const isMobileWeb = useIsMobileWeb();
  const tokens = useMemo(
    () => generateColorTokens(event.accentColor),
    [event.accentColor],
  );

  const timeLabel = useMemo(() => {
    return event.isAllDay
      ? "終日"
      : format(event.startsAt, "H:mm");
  }, [event.isAllDay, event.startsAt]);

  const titleLabel = event.title || "Untitled";
  const titleFadeStyle = isMobileWeb ? undefined : CHIP_TEXT_FADE_STYLE;
  const chipBorderLeft = event.isAllDay || isMobileWeb ? undefined : `3px solid ${tokens.border}`;
  const chipStyle = useMemo(() => createCalendarEventChipMonthStyle(tokens.bg, tokens.border, tokens.text, chipBorderLeft), [chipBorderLeft, tokens.bg, tokens.border, tokens.text]);

  return (
    <HoverMonthEventTooltip
      title={titleLabel}
      timeLabel={showTimeLabel ? timeLabel : null}
      accentColor={tokens.border}
      className="w-full min-w-0"
      disabled={tooltipDisabled}
    >
      <div
        data-calendar-event-chip="month"
        className={cn(
          eventChipAllDayClass,
          `
            flex
            w-full
            min-w-0
            items-center
            gap-1
          `,
        )}
        style={chipStyle}
      >
        {showTimeLabel && (
          <span
            className="
              shrink-0
              tabular-nums
              opacity-80
            "
          >
            {timeLabel}
          </span>
        )}

        <span
          className="event-chip-month-title min-w-0 flex-1 overflow-hidden whitespace-nowrap"
          style={titleFadeStyle}
        >
          {titleLabel}
        </span>
      </div>
    </HoverMonthEventTooltip>
  );
});

CalendarEventChipMonth.displayName = "CalendarEventChipMonth";

export { CalendarEventChipMonth };
