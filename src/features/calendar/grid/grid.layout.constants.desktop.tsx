//Month
export const MONTH_GRID_WEEKDAY_HEADER_HEIGHT_CLASS = "h-8";
export const MONTH_GRID_DAY_NUMBER_POSITION_CLASS = "left-0 top-0 md:left-3 md:top-1";
export const MONTH_GRID_MONTH_ANNOTATION_POSITION_CLASS = "left-[28px] top-[5px] md:left-[40px]";
export const MONTH_GRID_EVENTS_CONTAINER_POSITION_CLASS = "inset-x-px top-8";
export const MONTH_GRID_EVENTS_GAP_CLASS = "gap-[3px]";
export const MONTH_GRID_OVERFLOW_TEXT_CLASS = "w-full pr-3 text-right text-[11px] leading-none";

//Daydetail
export const DAY_DETAIL_HEADER_HEIGHT_CLASS = "h-8";
export const DAY_DETAIL_TIME_LABEL_WIDTH_CLASS = "w-12";
export const DAY_DETAIL_EVENT_PADDING_CLASS = "px-2 py-1";
export const DAY_DETAIL_EVENT_RADIUS_CLASS = "rounded-md";
export const DAY_DETAIL_EVENT_TEXT_CLASS = "text-[12px]";
export const DAY_DETAIL_SCROLL_AREA_CLASS = "overflow-y-auto";
export const DAY_DETAIL_CURRENT_TIME_LINE_CLASS = "left-12 right-0 h-px";
export const DAY_DETAIL_CURRENT_TIME_LABEL_CLASS = "-translate-y-1/2 text-[10px]";

// WeekDay

// time / grid
export const WEEKDAY_HOURS = 24;
export const WEEKDAY_MINUTES_PER_HOUR = 60;
export const WEEKDAY_HOUR_LABEL_FORMAT = typeof window !== "undefined" && window.innerWidth <= 767 ? "H" : "HH:mm";
export const WEEKDAY_DAY_FORMAT = "E";
export const WEEKDAY_DATE_FORMAT = "d";

export const WEEKDAY_GRID_TIME_COLUMN_Z_INDEX = 20;

// timing (current time hook)
export const WEEKDAY_CURRENT_TIME_UPDATE_INTERVAL_MS = 60_000;
export const WEEKDAY_SECONDS_PER_MINUTE = 60;
export const WEEKDAY_MS_PER_SECOND = 1000;

// layout css vars
export const WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT = "--calendar-hour-row-height" as const;
export const WEEKDAY_CSS_VAR_EVENT_START_HOUR = "--calendar-event-start-hour" as const;
export const WEEKDAY_CSS_VAR_EVENT_DURATION_HOURS = "--calendar-event-duration-hours" as const;

// indicator
export const WEEKDAY_CURRENT_TIME_INDICATOR_HEIGHT = 1.5;
export const WEEKDAY_CURRENT_TIME_DASHED_STYLE = "1.5px dashed";

// hour label
export const WEEKDAY_HOUR_LABEL_PADDING_RIGHT = "0.625rem";
export const WEEKDAY_HOUR_LABEL_FONT_SIZE = "11px";

// misc layout
export const WEEKDAY_EVENT_CHIP_PADDING_X = 2;
