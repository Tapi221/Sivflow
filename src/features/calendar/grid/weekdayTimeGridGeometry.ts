import type { CSSProperties } from "react";
import type { CalendarTimeGridLayoutEntry } from "@core/calendar";
import * as GRID from "./grid.layout.constants.desktop";

export type WeekdayTimedEventPositionStyle = CSSProperties & {
  left: string;
  top: string;
  width: string;
  height: string;
  minHeight: string;
};

export type WeekdayTimedEventFrame = {
  leftPercent: number;
  topHours: number;
  widthPercent: number;
  heightHours: number;
};

export type WeekdayTimedEventPositionOptions = {
  maxMinHeightHours?: number;
  suppressMinHeight?: boolean;
};

type WeekdayTimedEventHorizontalInsets = {
  leftPx: number;
  rightPx: number;
};

const EVENT_COLUMN_OUTER_INSET_PX = 1;
const EVENT_COLUMN_OVERLAP_GAP_PX = 2;
const EVENT_COLUMN_OVERLAP_SIDE_GAP_PX = EVENT_COLUMN_OVERLAP_GAP_PX / 2;
const EVENT_COLUMN_VERTICAL_TRIM_PX = 0.5;
export const WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX = 18;
const PERCENT_MAX = 100;
const SHORT_RANGE_CARRY_OVER_HIDE_THRESHOLD_HOURS = 1;
const TIME_GRID_DECIMAL_PLACES = 12;
const TIME_GRID_FLOATING_POINT_EPSILON = Number.EPSILON * 10;

const normalizeTimeGridNumber = (value: number): number => {
  const rounded = Number(value.toFixed(TIME_GRID_DECIMAL_PLACES));

  return Math.abs(value - rounded) <= TIME_GRID_FLOATING_POINT_EPSILON ? rounded : value;
};

const getPercentAsHourSpan = (percent: number, rangeHours: number): number => normalizeTimeGridNumber((percent / PERCENT_MAX) * rangeHours);

const getTrimmedEventLengthPx = (lengthPx: number): number => Math.max(0, lengthPx - EVENT_COLUMN_VERTICAL_TRIM_PX);

const getWeekdayTimedEventHorizontalInsets = (frame: WeekdayTimedEventFrame): WeekdayTimedEventHorizontalInsets => {
  const rightPercent = frame.leftPercent + frame.widthPercent;
  const leftPx = frame.leftPercent <= TIME_GRID_FLOATING_POINT_EPSILON ? EVENT_COLUMN_OUTER_INSET_PX : EVENT_COLUMN_OVERLAP_SIDE_GAP_PX;
  const rightPx = rightPercent >= PERCENT_MAX - TIME_GRID_FLOATING_POINT_EPSILON ? EVENT_COLUMN_OUTER_INSET_PX : EVENT_COLUMN_OVERLAP_SIDE_GAP_PX;

  return { leftPx, rightPx };
};

const createMinHeightStyle = ({ maxMinHeightHours, shouldHideEvent, suppressMinHeight }: { maxMinHeightHours?: number; shouldHideEvent: boolean; suppressMinHeight?: boolean }): string => {
  if (shouldHideEvent || suppressMinHeight) return "0px";

  const minHeightPx = getTrimmedEventLengthPx(WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX);

  if (maxMinHeightHours === undefined) return `${minHeightPx}px`;

  const normalizedMaxMinHeightHours = normalizeTimeGridNumber(Math.max(0, maxMinHeightHours));

  return `max(0px, min(${minHeightPx}px, calc(${normalizedMaxMinHeightHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}) - ${EVENT_COLUMN_VERTICAL_TRIM_PX}px)))`;
};

const shouldHideCarryOverEventInShortRange = (entry: CalendarTimeGridLayoutEntry, rangeHours: number): boolean => entry.startsBeforeRange && rangeHours <= SHORT_RANGE_CARRY_OVER_HIDE_THRESHOLD_HOURS;

export const getWeekdayTimedEventFrame = (entry: CalendarTimeGridLayoutEntry, rangeHours = GRID.WEEKDAY_HOURS): WeekdayTimedEventFrame => ({
  leftPercent: entry.style.xOffset,
  topHours: getPercentAsHourSpan(entry.style.top, rangeHours),
  widthPercent: entry.style.width,
  heightHours: getPercentAsHourSpan(entry.style.height, rangeHours),
});

export const getWeekdayTimedEventPositionStyle = (entry: CalendarTimeGridLayoutEntry, rangeHours = GRID.WEEKDAY_HOURS, options: WeekdayTimedEventPositionOptions = {}): WeekdayTimedEventPositionStyle => {
  const frame = getWeekdayTimedEventFrame(entry, rangeHours);
  const horizontalInsets = getWeekdayTimedEventHorizontalInsets(frame);
  const shouldHideEvent = shouldHideCarryOverEventInShortRange(entry, rangeHours);

  return {
    left: `calc(${frame.leftPercent}% + ${horizontalInsets.leftPx}px)`,
    top: `calc(${frame.topHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
    width: `calc(${frame.widthPercent}% - ${horizontalInsets.leftPx + horizontalInsets.rightPx}px)`,
    height: shouldHideEvent ? "0px" : `calc(${frame.heightHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}) - ${EVENT_COLUMN_VERTICAL_TRIM_PX}px)`,
    minHeight: createMinHeightStyle({ maxMinHeightHours: options.maxMinHeightHours, shouldHideEvent, suppressMinHeight: options.suppressMinHeight }),
    overflow: shouldHideEvent ? "hidden" : undefined,
    pointerEvents: shouldHideEvent ? "none" : undefined,
  };
};
