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

const EVENT_COLUMN_GAP_PX = 4;
const EVENT_COLUMN_INSET_PX = 3;
const MIN_EVENT_TITLE_LINE_HEIGHT_PX = 18;
const PERCENT_MAX = 100;
const SHORT_EVENT_THRESHOLD_MINUTES = 30;
const TIME_GRID_DECIMAL_PLACES = 12;
const TIME_GRID_FLOATING_POINT_EPSILON = Number.EPSILON * 10;

const normalizeTimeGridNumber = (value: number): number => {
  const rounded = Number(value.toFixed(TIME_GRID_DECIMAL_PLACES));

  return Math.abs(value - rounded) <= TIME_GRID_FLOATING_POINT_EPSILON ? rounded : value;
};

const getPercentAsHourSpan = (percent: number): number => normalizeTimeGridNumber((percent / PERCENT_MAX) * GRID.WEEKDAY_HOURS);

export const getWeekdayTimedEventDurationMinutes = (entry: CalendarTimeGridLayoutEntry): number => {
  return Math.max(0, (entry.event.endsAt.getTime() - entry.event.startsAt.getTime()) / 60_000);
};

export const isCompactWeekdayTimedEntry = (entry: CalendarTimeGridLayoutEntry): boolean => {
  return getWeekdayTimedEventDurationMinutes(entry) < SHORT_EVENT_THRESHOLD_MINUTES;
};

export const getWeekdayTimedEventFrame = (entry: CalendarTimeGridLayoutEntry): WeekdayTimedEventFrame => {
  return {
    leftPercent: entry.style.xOffset,
    topHours: getPercentAsHourSpan(entry.style.top),
    widthPercent: entry.style.width,
    heightHours: getPercentAsHourSpan(entry.style.height),
    compact: isCompactWeekdayTimedEntry(entry),
  };
};

export const getWeekdayTimedEventPositionStyle = (entry: CalendarTimeGridLayoutEntry): WeekdayTimedEventPositionStyle => {
  const frame = getWeekdayTimedEventFrame(entry);

  return {
    left: `calc(${frame.leftPercent}% + ${EVENT_COLUMN_INSET_PX}px)`,
    top: `calc(${frame.topHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
    width: `calc(${frame.widthPercent}% - ${EVENT_COLUMN_GAP_PX + EVENT_COLUMN_INSET_PX}px)`,
    height: `calc(${frame.heightHours} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
    minHeight: `${MIN_EVENT_TITLE_LINE_HEIGHT_PX}px`,
  };
};
