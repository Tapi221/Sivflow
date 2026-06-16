import type { CalendarTimeGridLayoutEntry } from "@core/calendar";
import { eventChipDesign } from "@web-renderer/chip/eventchip/eventChipDesign.generated";
import type { CSSProperties } from "react";
import * as GRID from "./grid.layout.constants.desktop";



type WeekdayTimedEventPositionStyle = CSSProperties & { left: string;
  top: string;
  width: string;
  height: string;
  minHeight: string;
};
type WeekdayTimedEventFrame = {
  leftPercent: number;
  topHours: number;
  widthPercent: number;
  heightHours: number;
};
type WeekdayTimedEventPositionOptions = {
  maxMinHeightHours?: number;
  suppressMinHeight?: boolean;
};
type WeekdayTimedEventHorizontalInsets = {
  leftPx: number;
  rightPx: number;
};



const PERCENT_MAX = 100;
const SHORT_RANGE_CARRY_OVER_HIDE_THRESHOLD_HOURS = 1;
const TIME_GRID_DECIMAL_PLACES = 12;
const TIME_GRID_FLOATING_POINT_EPSILON = Number.EPSILON * 10;
const WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX = eventChipDesign.weekdayGrid.timedMinHeightPx;



const normalizeTimeGridNumber = (value: number): number => {
  const rounded = Number(value.toFixed(TIME_GRID_DECIMAL_PLACES));

  return Math.abs(value - rounded) <= TIME_GRID_FLOATING_POINT_EPSILON ? rounded : value;
};
const getPercentAsHourSpan = (percent: number, rangeHours: number): number => normalizeTimeGridNumber((percent / PERCENT_MAX) * rangeHours);
const getTrimmedEventLengthPx = (lengthPx: number): number => Math.max(0, lengthPx - eventChipDesign.weekdayGrid.timedVerticalTrimPx);
const getWeekdayTimedEventHorizontalInsets = (frame: WeekdayTimedEventFrame): WeekdayTimedEventHorizontalInsets => {
  const rightPercent = frame.leftPercent + frame.widthPercent;
  const overlapSideGapPx = eventChipDesign.weekdayGrid.timedOverlapGapPx / 2;
  const leftPx = frame.leftPercent <= TIME_GRID_FLOATING_POINT_EPSILON ? eventChipDesign.weekdayGrid.timedOuterInsetPx : overlapSideGapPx;
  const rightPx = rightPercent >= PERCENT_MAX - TIME_GRID_FLOATING_POINT_EPSILON ? eventChipDesign.weekdayGrid.timedOuterInsetPx : overlapSideGapPx;

  return { leftPx, rightPx };
};
const createMinHeightStyle = ({ maxMinHeightHours, shouldHideEvent, suppressMinHeight }: { maxMinHeightHours?: number; shouldHideEvent: boolean; suppressMinHeight?: boolean; }): string => {
  if (shouldHideEvent || suppressMinHeight) return "0px";

  const minHeightPx = getTrimmedEventLengthPx(WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX);

  if (maxMinHeightHours === undefined) return `${minHeightPx}px`;

  const normalizedMaxMinHeightHours = normalizeTimeGridNumber(Math.max(0, maxMinHeightHours));

  return `max(0px, min(${minHeightPx}px, calc(${normalizedMaxMinHeightHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}) - ${eventChipDesign.weekdayGrid.timedVerticalTrimPx}px)))`;
};
const shouldHideCarryOverEventInShortRange = (entry: CalendarTimeGridLayoutEntry, rangeHours: number): boolean => entry.startsBeforeRange && rangeHours <= SHORT_RANGE_CARRY_OVER_HIDE_THRESHOLD_HOURS;
const getWeekdayTimedEventFrame = (entry: CalendarTimeGridLayoutEntry, rangeHours = GRID.WEEKDAY_HOURS): WeekdayTimedEventFrame => ({ leftPercent: entry.style.xOffset, topHours: getPercentAsHourSpan(entry.style.top, rangeHours), widthPercent: entry.style.width, heightHours: getPercentAsHourSpan(entry.style.height, rangeHours) });
const getWeekdayTimedEventPositionStyle = (entry: CalendarTimeGridLayoutEntry, rangeHours = GRID.WEEKDAY_HOURS, options: WeekdayTimedEventPositionOptions = {}): WeekdayTimedEventPositionStyle => {
  const frame = getWeekdayTimedEventFrame(entry, rangeHours);
  const horizontalInsets = getWeekdayTimedEventHorizontalInsets(frame);
  const shouldHideEvent = shouldHideCarryOverEventInShortRange(entry, rangeHours);

  return {
    left: `calc(${frame.leftPercent}% + ${horizontalInsets.leftPx}px)`,
    top: `calc(${frame.topHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
    width: `calc(${frame.widthPercent}% - ${horizontalInsets.leftPx + horizontalInsets.rightPx}px)`,
    height: shouldHideEvent ? "0px" : `calc(${frame.heightHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}) - ${eventChipDesign.weekdayGrid.timedVerticalTrimPx}px)`,
    minHeight: createMinHeightStyle({ maxMinHeightHours: options.maxMinHeightHours, shouldHideEvent, suppressMinHeight: options.suppressMinHeight }),
    overflow: shouldHideEvent ? "hidden" : undefined,
    pointerEvents: shouldHideEvent ? "none" : undefined,
  };
};



export { WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX, getWeekdayTimedEventFrame, getWeekdayTimedEventPositionStyle };


export type { WeekdayTimedEventPositionStyle, WeekdayTimedEventFrame, WeekdayTimedEventPositionOptions };
