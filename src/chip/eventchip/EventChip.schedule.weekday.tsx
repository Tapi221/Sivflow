import { useLayoutEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { HoverEventTooltip } from "@/chip/toolchip/HoverEventTooltip";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

type CalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  compact?: boolean;
};

const CHIP_CLASS = "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md py-1 pl-1.5 pr-0 text-left";
const CHIP_TITLE_CLASS = "overflow-hidden whitespace-normal break-words text-[12px] font-medium leading-snug";
const CHIP_TIME_CLASS = "overflow-hidden whitespace-nowrap text-[11px] font-semibold tabular-nums opacity-80";
const CHIP_MEASUREMENT_CLASS = "pointer-events-none invisible absolute inset-0 flex min-h-0 w-full flex-col overflow-hidden rounded-md py-1 pl-1.5 pr-0 text-left";
const CHIP_GAP_CLASS = "gap-1";
const CHIP_COMPACT_GAP_CLASS = "gap-0.5";
const CHIP_MEASUREMENT_TOLERANCE_PX = 1;

const canShowMeasuredTimeLabel = (container: HTMLDivElement, measurement: HTMLDivElement) => {
  return (
    measurement.scrollHeight <= container.clientHeight + CHIP_MEASUREMENT_TOLERANCE_PX &&
    measurement.scrollWidth <= container.clientWidth + CHIP_MEASUREMENT_TOLERANCE_PX
  );
};

const CalendarEventChipWeekday = ({
  event,
  compact = false,
}: CalendarEventChipWeekdayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [showTimeLabel, setShowTimeLabel] = useState(false);
  const tokens = generateColorTokens(event.accentColor);

  // Date 化
  const startsAt =
    event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt);

  const endsAt =
    event.endsAt instanceof Date
      ? event.endsAt
      : new Date(event.endsAt ?? event.startsAt);

  const timeLabel = event.isAllDay
    ? "終日"
    : `${format(startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;

  const titleLabel = event.title || "Untitled";

  useLayoutEffect(() => {
    if (compact) {
      setShowTimeLabel(false);
      return;
    }

    const container = containerRef.current;
    const measurement = measurementRef.current;

    if (!container || !measurement) return;

    let frameId = 0;

    const updateShowTimeLabel = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setShowTimeLabel(canShowMeasuredTimeLabel(container, measurement));
      });
    };

    updateShowTimeLabel();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateShowTimeLabel);

      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", updateShowTimeLabel);
      };
    }

    const resizeObserver = new ResizeObserver(updateShowTimeLabel);
    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [compact, timeLabel, titleLabel]);

  return (
    <HoverEventTooltip
      title={titleLabel}
      subtitle={timeLabel}
      accentColor={tokens.border}
      className="h-full min-h-0 w-full"
    >
      <div
        ref={containerRef}
        className={[CHIP_CLASS, compact ? CHIP_COMPACT_GAP_CLASS : CHIP_GAP_CLASS].join(" ")}
        style={{
          background: tokens.bg,
          borderLeft: `3px solid ${tokens.border}`,
          color: tokens.text,
        }}
      >
        <span className={CHIP_TITLE_CLASS}>{titleLabel}</span>

        {showTimeLabel ? <span className={CHIP_TIME_CLASS}>{timeLabel}</span> : null}

        {!compact ? (
          <div
            ref={measurementRef}
            aria-hidden="true"
            className={[CHIP_MEASUREMENT_CLASS, CHIP_GAP_CLASS].join(" ")}
          >
            <span className={CHIP_TITLE_CLASS}>{titleLabel}</span>
            <span className={CHIP_TIME_CLASS}>{timeLabel}</span>
          </div>
        ) : null}
      </div>
    </HoverEventTooltip>
  );
};

CalendarEventChipWeekday.displayName = "CalendarEventChipWeekday";

export { CalendarEventChipWeekday };
