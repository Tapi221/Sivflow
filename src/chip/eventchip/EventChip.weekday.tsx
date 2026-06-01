import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { HoverEventTooltip } from "@/chip/toolchip/HoverEventTooltip";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type CalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  tooltipDisabled?: boolean;
};

type ChipLayoutState = {
  showTimeLabel: boolean;
  titleLineClamp: number;
  useInlineTimeLayout: boolean;
};

const CHIP_ROOT_CLASS = "relative isolate h-full min-h-0 w-full";
const CHIP_LINE_MASK_CLASS = "pointer-events-none absolute inset-0 rounded-md bg-white";
const CHIP_BASE_CLASS = "relative z-10 flex h-full min-h-0 w-full overflow-hidden rounded-md text-left";
const CHIP_NORMAL_CLASS = "flex-col gap-[0.5px] py-[2px] pl-1 pr-[1px]";
const CHIP_INLINE_CLASS = "flex-col py-[1px] pl-1 pr-[1px]";
const CHIP_TITLE_CLASS = "overflow-hidden whitespace-normal break-words text-[12px] font-medium leading-[17px]";
const CHIP_TIME_CLASS = "overflow-hidden whitespace-normal break-words text-[11px] font-semibold leading-[16px] tabular-nums opacity-80";
const CHIP_INLINE_ROW_CLASS = "flex min-w-0 items-baseline gap-1 overflow-hidden";
const CHIP_INLINE_TITLE_CLASS = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium leading-[17px]";
const CHIP_INLINE_TIME_CLASS = "shrink-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold leading-[16px] tabular-nums opacity-80";
const CHIP_MEASUREMENT_BASE_CLASS = "pointer-events-none invisible absolute inset-0 flex min-h-0 w-full flex-col overflow-hidden rounded-md text-left";
const CHIP_MEASUREMENT_TOLERANCE_PX = 1;
const INLINE_TIME_GAP_PX = 4;
const DEFAULT_TITLE_LINE_CLAMP = 1;
const DEFAULT_CHIP_LAYOUT_STATE: ChipLayoutState = {
  showTimeLabel: false,
  titleLineClamp: DEFAULT_TITLE_LINE_CLAMP,
  useInlineTimeLayout: false,
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

const getElementTextWidth = (element: HTMLElement) => {
  const text = element.textContent ?? "";
  const styles = window.getComputedStyle(element);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return element.scrollWidth;

  context.font = [styles.fontStyle, styles.fontVariant, styles.fontWeight, styles.fontSize, styles.fontFamily].filter(Boolean).join(" ");

  return context.measureText(text).width;
};

const calculateTitleLineClamp = (availableHeight: number, fullTitleHeight: number, titleLineHeight: number) => {
  const visibleLineCount = Math.floor((availableHeight + CHIP_MEASUREMENT_TOLERANCE_PX) / titleLineHeight);
  const fullTitleLineCount = Math.ceil(fullTitleHeight / titleLineHeight);

  return Math.max(DEFAULT_TITLE_LINE_CLAMP, Math.min(fullTitleLineCount, visibleLineCount));
};

const calculateChipLayout = (container: HTMLDivElement, titleMeasurement: HTMLSpanElement, timeMeasurement: HTMLSpanElement): ChipLayoutState => {
  const containerStyles = window.getComputedStyle(container);
  const contentHeight = Math.max(0, container.clientHeight - getPixelValue(containerStyles.paddingTop) - getPixelValue(containerStyles.paddingBottom));
  const contentWidth = Math.max(0, container.clientWidth - getPixelValue(containerStyles.paddingLeft) - getPixelValue(containerStyles.paddingRight));
  const titleLineHeight = getElementLineHeight(titleMeasurement);
  const fullTitleHeight = titleMeasurement.scrollHeight;
  const timeHeight = timeMeasurement.scrollHeight;
  const rowGap = getPixelValue(containerStyles.rowGap || containerStyles.gap);
  const canShowTimeLabel = fullTitleHeight + rowGap + timeHeight <= contentHeight + CHIP_MEASUREMENT_TOLERANCE_PX;
  const titleAvailableHeight = canShowTimeLabel ? contentHeight - rowGap - timeHeight : contentHeight;
  const inlineContentWidth = getElementTextWidth(titleMeasurement) + INLINE_TIME_GAP_PX + getElementTextWidth(timeMeasurement);
  const canUseInlineTimeLayout = !canShowTimeLabel && inlineContentWidth <= contentWidth + CHIP_MEASUREMENT_TOLERANCE_PX;

  return {
    showTimeLabel: canShowTimeLabel,
    titleLineClamp: calculateTitleLineClamp(titleAvailableHeight, fullTitleHeight, titleLineHeight),
    useInlineTimeLayout: canUseInlineTimeLayout,
  };
};

const createTitleClampStyle = (lineClamp: number): CSSProperties => {
  if (lineClamp <= DEFAULT_TITLE_LINE_CLAMP) {
    return {
      display: "block",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    };
  }

  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lineClamp,
  };
};

const getChipClassName = (useInlineTimeLayout: boolean): string => [CHIP_BASE_CLASS, useInlineTimeLayout ? CHIP_INLINE_CLASS : CHIP_NORMAL_CLASS].join(" ");

const getMeasurementClassName = (): string => [CHIP_MEASUREMENT_BASE_CLASS, CHIP_NORMAL_CLASS].join(" ");

const CalendarEventChipWeekday = ({ event, tooltipDisabled = false }: CalendarEventChipWeekdayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleMeasurementRef = useRef<HTMLSpanElement>(null);
  const timeMeasurementRef = useRef<HTMLSpanElement>(null);
  const [chipLayout, setChipLayout] = useState<ChipLayoutState>(DEFAULT_CHIP_LAYOUT_STATE);
  const tokens = generateColorTokens(event.accentColor);
  const startsAt = event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt);
  const endsAt = event.endsAt instanceof Date ? event.endsAt : new Date(event.endsAt ?? event.startsAt);
  const timeLabel = event.isAllDay ? "終日" : `${format(startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;
  const titleLabel = event.title || "Untitled";

  useLayoutEffect(() => {
    const container = containerRef.current;
    const titleMeasurement = titleMeasurementRef.current;
    const timeMeasurement = timeMeasurementRef.current;

    if (!container || !titleMeasurement || !timeMeasurement) return;

    let frameId = 0;

    const updateChipLayout = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const nextLayout = calculateChipLayout(container, titleMeasurement, timeMeasurement);

        setChipLayout((previousLayout) => {
          if (previousLayout.showTimeLabel === nextLayout.showTimeLabel && previousLayout.titleLineClamp === nextLayout.titleLineClamp && previousLayout.useInlineTimeLayout === nextLayout.useInlineTimeLayout) {
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
  }, [timeLabel, titleLabel]);

  return (
    <HoverEventTooltip title={titleLabel} subtitle={timeLabel} accentColor={tokens.border} className="h-full min-h-0 w-full" disabled={tooltipDisabled}>
      <div className={CHIP_ROOT_CLASS}>
        <div aria-hidden="true" className={CHIP_LINE_MASK_CLASS} />
        <div
          ref={containerRef}
          className={getChipClassName(chipLayout.useInlineTimeLayout)}
          style={{
            background: tokens.bg,
            borderLeft: `3px solid ${tokens.border}`,
            color: tokens.text,
          }}
        >
          {chipLayout.useInlineTimeLayout ? (
            <div className={CHIP_INLINE_ROW_CLASS}>
              <span className={CHIP_INLINE_TITLE_CLASS}>{titleLabel}</span>
              <span className={CHIP_INLINE_TIME_CLASS}>{timeLabel}</span>
            </div>
          ) : (
            <>
              <span className={CHIP_TITLE_CLASS} style={createTitleClampStyle(chipLayout.titleLineClamp)}>
                {titleLabel}
              </span>

              {chipLayout.showTimeLabel ? <span className={CHIP_TIME_CLASS}>{timeLabel}</span> : null}
            </>
          )}

          <div aria-hidden="true" className={getMeasurementClassName()}>
            <span ref={titleMeasurementRef} className={CHIP_TITLE_CLASS}>
              {titleLabel}
            </span>
            <span ref={timeMeasurementRef} className={CHIP_TIME_CLASS}>
              {timeLabel}
            </span>
          </div>
        </div>
      </div>
    </HoverEventTooltip>
  );
};

CalendarEventChipWeekday.displayName = "CalendarEventChipWeekday";

export { CalendarEventChipWeekday };
