import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { HoverEventTooltip } from "@/chip/toolchip/HoverEventTooltip";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type CalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  compact?: boolean;
};

type ChipLayoutState = {
  showTimeLabel: boolean;
  titleLineClamp: number;
};

const CHIP_BASE_CLASS = "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md text-left";
const CHIP_NORMAL_CLASS = "gap-1 py-1 pl-1.5 pr-0";
const CHIP_COMPACT_CLASS = "gap-0 px-1.5 py-0.5";
const CHIP_TITLE_CLASS = "overflow-hidden whitespace-normal break-words text-[12px] font-medium leading-snug";
const CHIP_COMPACT_TITLE_CLASS = "truncate text-[11px] font-semibold leading-[14px]";
const CHIP_TIME_CLASS = "overflow-hidden whitespace-nowrap text-[11px] font-semibold tabular-nums opacity-80";
const CHIP_MEASUREMENT_BASE_CLASS = "pointer-events-none invisible absolute inset-0 flex min-h-0 w-full flex-col overflow-hidden rounded-md text-left";
const CHIP_MEASUREMENT_TOLERANCE_PX = 1;
const DEFAULT_TITLE_LINE_CLAMP = 1;
const DEFAULT_CHIP_LAYOUT_STATE: ChipLayoutState = {
  showTimeLabel: false,
  titleLineClamp: DEFAULT_TITLE_LINE_CLAMP,
};

const getPixelValue = (value: string) => {
  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const getElementLineHeight = (element: HTMLElement) => {
  const styles = window.getComputedStyle(element);
  const parsedLineHeight = Number.parseFloat(styles.lineHeight);

  if (Number.isFinite(parsedLineHeight)) return parsedLineHeight;

  const parsedFontSize = Number.parseFloat(styles.fontSize);

  return Number.isFinite(parsedFontSize) ? parsedFontSize * 1.2 : 16;
};

const calculateTitleLineClamp = (
  availableHeight: number,
  fullTitleHeight: number,
  titleLineHeight: number,
) => {
  const visibleLineCount = Math.floor(
    (availableHeight + CHIP_MEASUREMENT_TOLERANCE_PX) / titleLineHeight,
  );
  const fullTitleLineCount = Math.ceil(fullTitleHeight / titleLineHeight);

  return Math.max(
    DEFAULT_TITLE_LINE_CLAMP,
    Math.min(fullTitleLineCount, visibleLineCount),
  );
};

const calculateChipLayout = (
  container: HTMLDivElement,
  titleMeasurement: HTMLSpanElement,
  timeMeasurement: HTMLSpanElement,
  compact: boolean,
): ChipLayoutState => {
  const containerStyles = window.getComputedStyle(container);
  const contentHeight = Math.max(
    0,
    container.clientHeight -
      getPixelValue(containerStyles.paddingTop) -
      getPixelValue(containerStyles.paddingBottom),
  );
  const titleLineHeight = getElementLineHeight(titleMeasurement);
  const fullTitleHeight = titleMeasurement.scrollHeight;

  if (compact) {
    return {
      showTimeLabel: false,
      titleLineClamp: calculateTitleLineClamp(
        contentHeight,
        fullTitleHeight,
        titleLineHeight,
      ),
    };
  }

  const timeHeight = timeMeasurement.scrollHeight;
  const rowGap = getPixelValue(containerStyles.rowGap || containerStyles.gap);
  const canShowTimeLabel =
    fullTitleHeight + rowGap + timeHeight <=
    contentHeight + CHIP_MEASUREMENT_TOLERANCE_PX;
  const titleAvailableHeight = canShowTimeLabel
    ? contentHeight - rowGap - timeHeight
    : contentHeight;

  return {
    showTimeLabel: canShowTimeLabel,
    titleLineClamp: calculateTitleLineClamp(
      titleAvailableHeight,
      fullTitleHeight,
      titleLineHeight,
    ),
  };
};

const createTitleClampStyle = (lineClamp: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: lineClamp,
});

const getChipClassName = (compact: boolean): string => [
  CHIP_BASE_CLASS,
  compact ? CHIP_COMPACT_CLASS : CHIP_NORMAL_CLASS,
].join(" ");

const getTitleClassName = (compact: boolean): string => compact ? CHIP_COMPACT_TITLE_CLASS : CHIP_TITLE_CLASS;

const getMeasurementClassName = (compact: boolean): string => [
  CHIP_MEASUREMENT_BASE_CLASS,
  compact ? CHIP_COMPACT_CLASS : CHIP_NORMAL_CLASS,
].join(" ");

const CalendarEventChipWeekday = ({
  event,
  compact = false,
}: CalendarEventChipWeekdayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleMeasurementRef = useRef<HTMLSpanElement>(null);
  const timeMeasurementRef = useRef<HTMLSpanElement>(null);
  const [chipLayout, setChipLayout] = useState<ChipLayoutState>(
    DEFAULT_CHIP_LAYOUT_STATE,
  );
  const tokens = generateColorTokens(event.accentColor);
  const startsAt = event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt);
  const endsAt = event.endsAt instanceof Date ? event.endsAt : new Date(event.endsAt ?? event.startsAt);
  const timeLabel = event.isAllDay ? "終日" : `${format(startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;
  const titleLabel = event.title || "Untitled";
  const titleClassName = getTitleClassName(compact);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const titleMeasurement = titleMeasurementRef.current;
    const timeMeasurement = timeMeasurementRef.current;

    if (!container || !titleMeasurement || !timeMeasurement) return;

    let frameId = 0;

    const updateChipLayout = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const nextLayout = calculateChipLayout(
          container,
          titleMeasurement,
          timeMeasurement,
          compact,
        );

        setChipLayout((previousLayout) => {
          if (
            previousLayout.showTimeLabel === nextLayout.showTimeLabel &&
            previousLayout.titleLineClamp === nextLayout.titleLineClamp
          ) {
            return previousLayout;
          }

          return nextLayout;
        });
      });
    };

    updateChipLayout();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateChipLayout);

      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", updateChipLayout);
      };
    }

    const resizeObserver = new ResizeObserver(updateChipLayout);
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
        className={getChipClassName(compact)}
        style={{
          background: tokens.bg,
          borderLeft: `3px solid ${tokens.border}`,
          color: tokens.text,
        }}
      >
        <span
          className={titleClassName}
          style={compact ? undefined : createTitleClampStyle(chipLayout.titleLineClamp)}
        >
          {titleLabel}
        </span>

        {chipLayout.showTimeLabel ? <span className={CHIP_TIME_CLASS}>{timeLabel}</span> : null}

        <div
          aria-hidden="true"
          className={getMeasurementClassName(compact)}
        >
          <span ref={titleMeasurementRef} className={titleClassName}>
            {titleLabel}
          </span>
          <span ref={timeMeasurementRef} className={CHIP_TIME_CLASS}>
            {timeLabel}
          </span>
        </div>
      </div>
    </HoverEventTooltip>
  );
};

CalendarEventChipWeekday.displayName = "CalendarEventChipWeekday";

export { CalendarEventChipWeekday };
