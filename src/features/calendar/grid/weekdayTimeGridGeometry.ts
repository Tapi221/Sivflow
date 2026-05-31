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
  compact: boolean;
};

export type WeekdayTimedEventPositionOptions = {
  suppressMinHeight?: boolean;
};

const EVENT_COLUMN_GAP_PX = 4;
const EVENT_COLUMN_INSET_PX = 3;
export const WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX = 18;
const PERCENT_MAX = 100;
const SHORT_EVENT_THRESHOLD_MINUTES = 30;
const TIME_GRID_DECIMAL_PLACES = 12;
const TIME_GRID_FLOATING_POINT_EPSILON = Number.EPSILON * 10;

const normalizeTimeGridNumber = (value: number): number => {
  const rounded = Number(value.toFixed(TIME_GRID_DECIMAL_PLACES));

  return Math.abs(value - rounded) <= TIME_GRID_FLOATING_POINT_EPSILON ? rounded : value;
};

const getPercentAsHourSpan = (percent: number, rangeHours: number): number => normalizeTimeGridNumber((percent / PERCENT_MAX) * rangeHours);

export const getWeekdayTimedEventDurationMinutes = (entry: CalendarTimeGridLayoutEntry): number => {
  return Math.max(0, (entry.event.endsAt.getTime() - entry.event.startsAt.getTime()) / 60_000);
};

export const isCompactWeekdayTimedEntry = (entry: CalendarTimeGridLayoutEntry): boolean => {
  return getWeekdayTimedEventDurationMinutes(entry) < SHORT_EVENT_THRESHOLD_MINUTES;
};

export const getWeekdayTimedEventFrame = (entry: CalendarTimeGridLayoutEntry, rangeHours = GRID.WEEKDAY_HOURS): WeekdayTimedEventFrame => {
  return {
    leftPercent: entry.style.xOffset,
    topHours: getPercentAsHourSpan(entry.style.top, rangeHours),
    widthPercent: entry.style.width,
    heightHours: getPercentAsHourSpan(entry.style.height, rangeHours),
    compact: isCompactWeekdayTimedEntry(entry),
  };
};

export const getWeekdayTimedEventPositionStyle = (entry: CalendarTimeGridLayoutEntry, rangeHours = GRID.WEEKDAY_HOURS, options: WeekdayTimedEventPositionOptions = {}): WeekdayTimedEventPositionStyle => {
  const frame = getWeekdayTimedEventFrame(entry, rangeHours);

  return {
    left: `calc(${frame.leftPercent}% + ${EVENT_COLUMN_INSET_PX}px)`,
    top: `calc(${frame.topHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
    width: `calc(${frame.widthPercent}% - ${EVENT_COLUMN_GAP_PX + EVENT_COLUMN_INSET_PX}px)`,
    height: `calc(${frame.heightHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
    minHeight: options.suppressMinHeight ? "0px" : `${WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX}px`,
  };
};
