import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  isSameDay,
  isSameMonth,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import type {
  CSSProperties,
  KeyboardEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  UIEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import type { IconProps } from "@/ui/icons";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
} from "@/ui/icons";
import { ExplorerCalendarMonthView } from "./ExplorerCalendarMonthView";

type ExplorerCalendarPaneProps = {
  onClose?: () => void;
};

type CalendarViewMode = "month" | "week" | "days";

type CalendarDemoEvent = {
  id: string;
  title: string;
  startsAt: Date;
  minutes: number;
};

type TimelineBufferDays = {
  before: number;
  after: number;
};

type TimelineRowResizeState = {
  startY: number;
  startHeight: number;
};

type TimelineGridStyle = CSSProperties & {
  "--calendar-all-day-row-height": string;
  "--calendar-hour-row-height": string;
};

type CalendarEventStyle = CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

const MIN_RANGE_DAYS = 1;
const MAX_RANGE_DAYS = 6;
const DEFAULT_RANGE_DAYS = 3;
const RANGE_DAY_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
const RANGE_DAYS_STORAGE_KEY = "flashcard-master.calendar.rangeDays";
const DEFAULT_ALL_DAY_ROW_HEIGHT = 46;
const MIN_ALL_DAY_ROW_HEIGHT = 28;
const MAX_ALL_DAY_ROW_HEIGHT = 180;
const DEFAULT_HOUR_ROW_HEIGHT = 88;
const MIN_HOUR_ROW_HEIGHT = 48;
const MAX_HOUR_ROW_HEIGHT = 180;
const ROW_HEIGHT_STEP = 4;
const ALL_DAY_ROW_HEIGHT_STORAGE_KEY =
  "flashcard-master.calendar.allDayRowHeight";
const HOUR_ROW_HEIGHT_STORAGE_KEY = "flashcard-master.calendar.hourRowHeight";
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const WEEK_STARTS_ON_MONDAY = 1;
const TIME_COLUMN_WIDTH = 74;
const DAY_COLUMN_MIN_WIDTH = 136;
const MONTH_NAVIGATION_STEP = 1;
const INITIAL_TIMELINE_BUFFER_DAYS = 7;
const TIMELINE_EXTEND_DAYS = 14;
const TIMELINE_EDGE_THRESHOLD_PX = 320;

const VIEW_MODE_OPTIONS = [
  { value: "month", label: "月" },
  { value: "week", label: "週" },
  { value: "days", label: "日数" },
] satisfies Array<{ value: CalendarViewMode; label: string }>;

const TimelineToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 3H11C11.5523 3 12 3.44772 12 4V5C12 5.55228 11.5523 6 11 6H2C1.44772 6 1 5.55228 1 5V4C1 3.44772 1.44772 3 2 3ZM0 4C0 2.89543 0.895431 2 2 2H11C12.1046 2 13 2.89543 13 4V5C13 6.10457 12.1046 7 11 7H2C0.89543 7 0 6.10457 0 5V4ZM5 10H14C14.5523 10 15 10.4477 15 11V12C15 12.5523 14.5523 13 14 13H5C4.44772 13 4 12.5523 4 12V11C4 10.4477 4.44772 10 5 10ZM3 11C3 9.89543 3.89543 9 5 9H14C15.1046 9 16 9.89543 16 11V12C16 13.1046 15.1046 14 14 14H5C3.89543 14 3 13.1046 3 12V11Z"
      fill="#74798B"
    />
  </svg>
);

const SortToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9337 5.49595L8.00095 2.125L4.06817 5.49595C3.78932 5.73497 3.75703 6.15478 3.99604 6.43363C4.23506 6.71248 4.65487 6.74478 4.93373 6.50576L8.00095 3.87671L11.0682 6.50576C11.347 6.74478 11.7668 6.71248 12.0059 6.43363C12.2449 6.15478 12.2126 5.73497 11.9337 5.49595ZM4.06823 10.506L8.001 13.877L11.9338 10.506C12.2126 10.267 12.2449 9.84717 12.0059 9.56832C11.7669 9.28947 11.3471 9.25717 11.0682 9.49619L8.001 12.1252L4.93378 9.49619C4.65493 9.25717 4.23511 9.28947 3.9961 9.56832C3.75708 9.84717 3.78938 10.267 4.06823 10.506Z"
      fill="#8F929C"
    />
  </svg>
);

const FieldsToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.00094 3.33594C1.63367 3.33594 1.33594 3.63367 1.33594 4.00094C1.33594 4.36821 1.63367 4.66594 2.00094 4.66594H2.0076C2.37487 4.66594 2.6726 4.36821 2.6726 4.00094C2.6726 3.63367 2.37487 3.33594 2.0076 3.33594H2.00094ZM5.33443 3.33594C4.96716 3.33594 4.66943 3.63367 4.66943 4.00094C4.66943 4.36821 4.96716 4.66594 5.33443 4.66594H14.0011C14.3684 4.66594 14.6661 4.36821 14.6661 4.00094C14.6661 3.63367 14.3684 3.33594 14.0011 3.33594H5.33443ZM5.33443 7.33594C4.96716 7.33594 4.66943 7.63367 4.66943 8.00094C4.66943 8.36821 4.96716 8.66594 5.33443 8.66594H14.0011C14.3684 8.66594 14.6661 8.36821 14.6661 8.00094C14.6661 7.63367 14.3684 7.33594 14.0011 7.33594H5.33443ZM4.66943 12.0009C4.66943 11.6337 4.96716 11.3359 5.33443 11.3359H14.0011C14.3684 11.3359 14.6661 11.6337 14.6661 12.0009C14.6661 12.3682 14.3684 12.6659 14.0011 12.6659H5.33443C4.96716 12.6659 4.66943 12.3682 4.66943 12.0009ZM1.33594 8.00094C1.33594 7.63367 1.63367 7.33594 2.00094 7.33594H2.0076C2.37487 7.33594 2.6726 7.63367 2.6726 8.00094C2.6726 8.36821 2.37487 8.66594 2.0076 8.66594H2.00094C1.63367 8.66594 1.33594 8.36821 1.33594 8.00094ZM2.00094 11.3359C1.63367 11.3359 1.33594 11.6337 1.33594 12.0009C1.33594 12.3682 1.63367 12.6659 2.00094 12.6659H2.0076C2.37487 12.6659 2.6726 12.3682 2.6726 12.0009C2.6726 11.6337 2.37487 11.3359 2.0076 11.3359H2.00094Z"
      fill="#74798B"
    />
  </svg>
);

type CalendarToolbarMode = "calendar" | "timeline";

type CalendarWorkspaceToolbarProps = {
  activeMode: CalendarToolbarMode;
  onSelectCalendar: () => void;
  onSelectTimeline: () => void;
};

const CALENDAR_TOOLBAR_ACTIONS = [
  { label: "Search", icon: Search },
  { label: "Filter", icon: Filter },
  { label: "Sort", icon: SortToolbarIcon },
  { label: "Fields", icon: FieldsToolbarIcon },
] as const;

const CalendarWorkspaceToolbar = ({
  activeMode,
  onSelectCalendar,
  onSelectTimeline,
}: CalendarWorkspaceToolbarProps) => {
  const tabs = [
    {
      value: "calendar",
      label: "Calendar",
      icon: CalendarIcon,
      onClick: onSelectCalendar,
    },
    {
      value: "timeline",
      label: "Timeline",
      icon: TimelineToolbarIcon,
      onClick: onSelectTimeline,
    },
  ] as const;

  return (
    <div className="relative flex h-9 shrink-0 flex-wrap items-start justify-between overflow-hidden bg-white after:absolute after:bottom-1 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']">
      <div className="flex h-9 shrink-0 items-start gap-[6px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMode === tab.value;

          return (
            <div key={tab.value} className="flex flex-col items-start pb-2">
              <button
                type="button"
                className={cn(
                  "flex h-7 items-center gap-[6px] rounded py-[3px] pl-0 pr-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal transition-colors hover:bg-[#f6f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "text-[#25272d]" : "text-[#8f929c]",
                )}
                aria-pressed={isActive}
                onClick={tab.onClick}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "flex h-7 items-center whitespace-nowrap",
                    isActive && "border-b-2 border-[#74798b]",
                  )}
                >
                  {tab.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex h-7 shrink-0 items-center justify-end gap-[6px]">
        {CALENDAR_TOOLBAR_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          const isLast = index === CALENDAR_TOOLBAR_ACTIONS.length - 1;

          return (
            <button
              key={action.label}
              type="button"
              className={cn(
                "flex h-7 items-center gap-[6px] rounded py-[3px] pl-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal text-[#8f929c] transition-colors hover:bg-[#f6f7f9] hover:text-[#25272d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isLast ? "pr-0" : "pr-2",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const createInitialTimelineBuffer = (): TimelineBufferDays => ({
  before: INITIAL_TIMELINE_BUFFER_DAYS,
  after: INITIAL_TIMELINE_BUFFER_DAYS,
});

const clampRowHeight = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const normalizeStoredRowHeight = (value: number) => {
  return Math.round(value);
};

const clampRangeDays = (value: number) => {
  return Math.min(MAX_RANGE_DAYS, Math.max(MIN_RANGE_DAYS, Math.round(value)));
};

const readStoredRangeDays = () => {
  if (typeof window === "undefined") {
    return DEFAULT_RANGE_DAYS;
  }

  const rawValue = window.localStorage.getItem(RANGE_DAYS_STORAGE_KEY);
  const parsedValue = rawValue === null ? Number.NaN : Number(rawValue);

  return Number.isFinite(parsedValue)
    ? clampRangeDays(parsedValue)
    : DEFAULT_RANGE_DAYS;
};

const writeStoredRangeDays = (value: number) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RANGE_DAYS_STORAGE_KEY, String(value));
};

const clampAllDayRowHeight = (value: number) => {
  return clampRowHeight(value, MIN_ALL_DAY_ROW_HEIGHT, MAX_ALL_DAY_ROW_HEIGHT);
};

const clampHourRowHeight = (value: number) => {
  return clampRowHeight(value, MIN_HOUR_ROW_HEIGHT, MAX_HOUR_ROW_HEIGHT);
};

const readStoredRowHeight = (
  storageKey: string,
  defaultValue: number,
  clampValue: (value: number) => number,
) => {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  const rawValue = window.localStorage.getItem(storageKey);
  const parsedValue = rawValue === null ? Number.NaN : Number(rawValue);

  return Number.isFinite(parsedValue) ? clampValue(parsedValue) : defaultValue;
};

const readStoredAllDayRowHeight = () => {
  return readStoredRowHeight(
    ALL_DAY_ROW_HEIGHT_STORAGE_KEY,
    DEFAULT_ALL_DAY_ROW_HEIGHT,
    clampAllDayRowHeight,
  );
};

const readStoredHourRowHeight = () => {
  return readStoredRowHeight(
    HOUR_ROW_HEIGHT_STORAGE_KEY,
    DEFAULT_HOUR_ROW_HEIGHT,
    clampHourRowHeight,
  );
};

const writeStoredRowHeight = (storageKey: string, value: number) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    String(normalizeStoredRowHeight(value)),
  );
};

const getRangeDayCount = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  rangeDays: number,
) => {
  if (viewMode === "month") {
    return getDaysInMonth(baseDate);
  }

  return viewMode === "week" ? 7 : rangeDays;
};

const getViewportDayCount = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  rangeDays: number,
) => {
  if (viewMode === "month") {
    return 7;
  }

  return getRangeDayCount(baseDate, viewMode, rangeDays);
};

const createVisibleDays = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  rangeDays: number,
  timelineBuffer: TimelineBufferDays,
) => {
  const normalizedDate = startOfDay(baseDate);
  const startDate =
    viewMode === "month"
      ? startOfMonth(normalizedDate)
      : viewMode === "week"
        ? startOfWeek(normalizedDate, { weekStartsOn: WEEK_STARTS_ON_MONDAY })
        : normalizedDate;
  const visibleDayCount = getRangeDayCount(normalizedDate, viewMode, rangeDays);
  const timelineStartDate = subDays(startDate, timelineBuffer.before);
  const timelineDayCount =
    timelineBuffer.before + visibleDayCount + timelineBuffer.after;

  return Array.from({ length: timelineDayCount }, (_, index) =>
    addDays(timelineStartDate, index),
  );
};

const createHourLabel = (hour: number) => {
  return `${String(hour).padStart(2, "0")}:00`;
};

const createDemoEvents = (baseDate: Date): CalendarDemoEvent[] => {
  const selectedDate = startOfDay(baseDate);
  const nextDate = addDays(selectedDate, 1);

  return [
    {
      id: "review-core",
      title: "復習キュー",
      startsAt: setMinutes(setHours(selectedDate, 9), 0),
      minutes: 45,
    },
    {
      id: "deck-maintenance",
      title: "カード整理",
      startsAt: setMinutes(setHours(selectedDate, 14), 30),
      minutes: 60,
    },
    {
      id: "next-preview",
      title: "次回確認",
      startsAt: setMinutes(setHours(nextDate, 11), 0),
      minutes: 30,
    },
  ];
};

const calculateEventStyle = (event: CalendarDemoEvent): CalendarEventStyle => {
  const startHour =
    event.startsAt.getHours() + event.startsAt.getMinutes() / 60;

  return {
    "--calendar-event-start-hour": Math.max(0, startHour - HOURS[0]),
    "--calendar-event-duration-hours": event.minutes / 60,
  };
};

export const ExplorerCalendarPane = ({
  onClose,
}: ExplorerCalendarPaneProps) => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const rangeDaysMenuRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineGridRef = useRef<HTMLDivElement | null>(null);
  const prependScrollCorrectionRef = useRef(0);
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);
  const shouldSyncScrollRef = useRef(true);
  const renderModeFrameRef = useRef<number | null>(null);
  const allDayRowResizeStateRef = useRef<TimelineRowResizeState | null>(null);
  const hourRowResizeStateRef = useRef<TimelineRowResizeState | null>(null);
  const allDayRowHeightRef = useRef(DEFAULT_ALL_DAY_ROW_HEIGHT);
  const hourRowHeightRef = useRef(DEFAULT_HOUR_ROW_HEIGHT);
  const pendingAllDayRowHeightRef = useRef(DEFAULT_ALL_DAY_ROW_HEIGHT);
  const pendingHourRowHeightRef = useRef(DEFAULT_HOUR_ROW_HEIGHT);
  const allDayRowResizeFrameRef = useRef<number | null>(null);
  const hourRowResizeFrameRef = useRef<number | null>(null);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [monthTitleDate, setMonthTitleDate] = useState(() =>
    startOfMonth(new Date()),
  );
  const [monthScrollTargetToken, setMonthScrollTargetToken] = useState(0);
  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewMode>("month");
  const [renderedViewMode, setRenderedViewMode] =
    useState<CalendarViewMode>("month");
  const [rangeDays, setRangeDays] = useState(readStoredRangeDays);
  const [isRangeDaysMenuOpen, setIsRangeDaysMenuOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [timelineBuffer, setTimelineBuffer] = useState(
    createInitialTimelineBuffer,
  );
  const [allDayRowHeight, setAllDayRowHeight] = useState(
    readStoredAllDayRowHeight,
  );
  const [hourRowHeight, setHourRowHeight] = useState(readStoredHourRowHeight);

  const visibleDays = useMemo(
    () =>
      renderedViewMode === "month"
        ? []
        : createVisibleDays(
            currentDate,
            renderedViewMode,
            rangeDays,
            timelineBuffer,
          ),
    [currentDate, rangeDays, renderedViewMode, timelineBuffer],
  );
  const demoEvents = useMemo(
    () => (renderedViewMode === "month" ? [] : createDemoEvents(currentDate)),
    [currentDate, renderedViewMode],
  );

  const calendarTitleDate =
    selectedViewMode === "month" ? monthTitleDate : currentDate;
  const monthLabel = format(calendarTitleDate, "yyyy年 M月", { locale: ja });
  const viewportDayCount = getViewportDayCount(
    currentDate,
    renderedViewMode,
    rangeDays,
  );
  const measuredViewportWidth =
    viewportWidth > 0
      ? viewportWidth
      : (contentViewportRef.current?.clientWidth ?? 0);
  const dayColumnWidth =
    measuredViewportWidth > TIME_COLUMN_WIDTH
      ? Math.max(
          1,
          (measuredViewportWidth - TIME_COLUMN_WIDTH) /
            Math.max(1, viewportDayCount),
        )
      : DAY_COLUMN_MIN_WIDTH;
  const gridWidth = TIME_COLUMN_WIDTH + visibleDays.length * dayColumnWidth;
  const dayNavigationStep = selectedViewMode === "week" ? 7 : rangeDays;
  const timelineGridStyle: TimelineGridStyle = {
    "--calendar-all-day-row-height": `${allDayRowHeight}px`,
    "--calendar-hour-row-height": `${hourRowHeight}px`,
    gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, ${dayColumnWidth}px)`,
    minWidth: `${gridWidth}px`,
  };

  const applyTimelineRowHeightVariable = useCallback(
    (variableName: string, nextHeight: number) => {
      timelineGridRef.current?.style.setProperty(
        variableName,
        `${nextHeight}px`,
      );
    },
    [],
  );

  const scheduleTimelineRowHeightVariable = useCallback(
    (
      variableName: string,
      nextHeight: number,
      clampValue: (value: number) => number,
      pendingValueRef: MutableRefObject<number>,
      frameRef: MutableRefObject<number | null>,
    ) => {
      const clampedHeight = clampValue(nextHeight);
      pendingValueRef.current = clampedHeight;

      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        applyTimelineRowHeightVariable(variableName, pendingValueRef.current);
      });
    },
    [applyTimelineRowHeightVariable],
  );

  const commitTimelineRowHeight = useCallback(
    (
      variableName: string,
      nextHeight: number,
      storageKey: string,
      clampValue: (value: number) => number,
      currentValueRef: MutableRefObject<number>,
      pendingValueRef: MutableRefObject<number>,
      frameRef: MutableRefObject<number | null>,
      setValue: (value: number) => void,
    ) => {
      const clampedHeight = clampValue(nextHeight);
      const committedHeight = normalizeStoredRowHeight(clampedHeight);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      currentValueRef.current = committedHeight;
      pendingValueRef.current = committedHeight;
      applyTimelineRowHeightVariable(variableName, committedHeight);
      writeStoredRowHeight(storageKey, committedHeight);
      setValue(committedHeight);
    },
    [applyTimelineRowHeightVariable],
  );

  const scheduleAllDayRowHeightVariable = useCallback(
    (nextHeight: number) => {
      scheduleTimelineRowHeightVariable(
        "--calendar-all-day-row-height",
        nextHeight,
        clampAllDayRowHeight,
        pendingAllDayRowHeightRef,
        allDayRowResizeFrameRef,
      );
    },
    [scheduleTimelineRowHeightVariable],
  );

  const scheduleHourRowHeightVariable = useCallback(
    (nextHeight: number) => {
      scheduleTimelineRowHeightVariable(
        "--calendar-hour-row-height",
        nextHeight,
        clampHourRowHeight,
        pendingHourRowHeightRef,
        hourRowResizeFrameRef,
      );
    },
    [scheduleTimelineRowHeightVariable],
  );

  const commitAllDayRowHeight = useCallback(
    (nextHeight: number) => {
      commitTimelineRowHeight(
        "--calendar-all-day-row-height",
        nextHeight,
        ALL_DAY_ROW_HEIGHT_STORAGE_KEY,
        clampAllDayRowHeight,
        allDayRowHeightRef,
        pendingAllDayRowHeightRef,
        allDayRowResizeFrameRef,
        setAllDayRowHeight,
      );
    },
    [commitTimelineRowHeight],
  );

  const commitHourRowHeight = useCallback(
    (nextHeight: number) => {
      commitTimelineRowHeight(
        "--calendar-hour-row-height",
        nextHeight,
        HOUR_ROW_HEIGHT_STORAGE_KEY,
        clampHourRowHeight,
        hourRowHeightRef,
        pendingHourRowHeightRef,
        hourRowResizeFrameRef,
        setHourRowHeight,
      );
    },
    [commitTimelineRowHeight],
  );

  const requestMonthScrollTarget = useCallback(() => {
    setMonthScrollTargetToken((current) => current + 1);
  }, []);

  const resetTimelinePosition = useCallback(() => {
    shouldSyncScrollRef.current = true;
    setTimelineBuffer(createInitialTimelineBuffer());
  }, []);

  const scheduleRenderedViewMode = useCallback(
    (nextViewMode: CalendarViewMode) => {
      if (renderModeFrameRef.current !== null) {
        window.cancelAnimationFrame(renderModeFrameRef.current);
      }

      renderModeFrameRef.current = window.requestAnimationFrame(() => {
        renderModeFrameRef.current = null;
        setRenderedViewMode(nextViewMode);
      });
    },
    [],
  );

  const syncScrollToRangeStart = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || dayColumnWidth <= 0) {
      return;
    }

    scrollContainer.scrollLeft = timelineBuffer.before * dayColumnWidth;
  }, [dayColumnWidth, timelineBuffer.before]);

  useEffect(() => {
    allDayRowHeightRef.current = allDayRowHeight;
    pendingAllDayRowHeightRef.current = allDayRowHeight;
    applyTimelineRowHeightVariable(
      "--calendar-all-day-row-height",
      allDayRowHeight,
    );
  }, [allDayRowHeight, applyTimelineRowHeightVariable]);

  useEffect(() => {
    hourRowHeightRef.current = hourRowHeight;
    pendingHourRowHeightRef.current = hourRowHeight;
    applyTimelineRowHeightVariable("--calendar-hour-row-height", hourRowHeight);
  }, [applyTimelineRowHeightVariable, hourRowHeight]);

  useEffect(() => {
    return () => {
      if (renderModeFrameRef.current !== null) {
        window.cancelAnimationFrame(renderModeFrameRef.current);
      }

      if (allDayRowResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(allDayRowResizeFrameRef.current);
      }

      if (hourRowResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(hourRowResizeFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isRangeDaysMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!rangeDaysMenuRef.current?.contains(target)) {
        setIsRangeDaysMenuOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRangeDaysMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRangeDaysMenuOpen]);

  useLayoutEffect(() => {
    const contentViewport = contentViewportRef.current;

    if (!contentViewport) {
      return undefined;
    }

    const updateViewportWidth = () => {
      shouldSyncScrollRef.current = true;
      const nextWidth = contentViewport.clientWidth;
      setViewportWidth((current) =>
        current === nextWidth ? current : nextWidth,
      );
    };

    updateViewportWidth();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateViewportWidth);
    resizeObserver.observe(contentViewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (renderedViewMode === "month" || !shouldSyncScrollRef.current) {
      return;
    }

    syncScrollToRangeStart();
    shouldSyncScrollRef.current = false;
  }, [
    currentDate,
    rangeDays,
    syncScrollToRangeStart,
    renderedViewMode,
    viewportWidth,
  ]);

  useLayoutEffect(() => {
    if (renderedViewMode === "month") {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const correction = prependScrollCorrectionRef.current;

    if (!scrollContainer || correction <= 0) {
      isExtendingLeftRef.current = false;
      return;
    }

    scrollContainer.scrollLeft += correction;
    prependScrollCorrectionRef.current = 0;
    isExtendingLeftRef.current = false;
  }, [dayColumnWidth, renderedViewMode, timelineBuffer.before]);

  useEffect(() => {
    isExtendingRightRef.current = false;
  }, [timelineBuffer.after]);

  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;

      if (renderedViewMode === "month" || dayColumnWidth <= 0) {
        return;
      }

      if (
        target.scrollLeft < TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;
        prependScrollCorrectionRef.current +=
          TIMELINE_EXTEND_DAYS * dayColumnWidth;
        setTimelineBuffer((prev) => ({
          ...prev,
          before: prev.before + TIMELINE_EXTEND_DAYS,
        }));
      }

      const distanceToRightEdge =
        target.scrollWidth - target.clientWidth - target.scrollLeft;

      if (
        distanceToRightEdge < TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;
        setTimelineBuffer((prev) => ({
          ...prev,
          after: prev.after + TIMELINE_EXTEND_DAYS,
        }));
      }
    },
    [dayColumnWidth, renderedViewMode],
  );

  const handleTimelineRowResizePointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      currentValueRef: MutableRefObject<number>,
      pendingValueRef: MutableRefObject<number>,
      resizeStateRef: MutableRefObject<TimelineRowResizeState | null>,
      scheduleHeightVariable: (nextHeight: number) => void,
      commitHeight: (nextHeight: number) => void,
    ) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();

      const startHeight = currentValueRef.current;
      resizeStateRef.current = {
        startY: event.clientY,
        startHeight,
      };
      pendingValueRef.current = startHeight;

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const resizeState = resizeStateRef.current;

        if (!resizeState) {
          return;
        }

        scheduleHeightVariable(
          resizeState.startHeight + moveEvent.clientY - resizeState.startY,
        );
      };

      const handlePointerUp = () => {
        commitHeight(pendingValueRef.current);
        resizeStateRef.current = null;
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [],
  );

  const handleAllDayRowResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      handleTimelineRowResizePointerDown(
        event,
        allDayRowHeightRef,
        pendingAllDayRowHeightRef,
        allDayRowResizeStateRef,
        scheduleAllDayRowHeightVariable,
        commitAllDayRowHeight,
      );
    },
    [
      commitAllDayRowHeight,
      handleTimelineRowResizePointerDown,
      scheduleAllDayRowHeightVariable,
    ],
  );

  const handleHourRowResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      handleTimelineRowResizePointerDown(
        event,
        hourRowHeightRef,
        pendingHourRowHeightRef,
        hourRowResizeStateRef,
        scheduleHourRowHeightVariable,
        commitHourRowHeight,
      );
    },
    [
      commitHourRowHeight,
      handleTimelineRowResizePointerDown,
      scheduleHourRowHeightVariable,
    ],
  );

  const handleAllDayRowResizeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      commitAllDayRowHeight(allDayRowHeightRef.current - ROW_HEIGHT_STEP);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      commitAllDayRowHeight(allDayRowHeightRef.current + ROW_HEIGHT_STEP);
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      commitAllDayRowHeight(allDayRowHeightRef.current - ROW_HEIGHT_STEP * 4);
      return;
    }

    if (event.key === "PageDown") {
      event.preventDefault();
      commitAllDayRowHeight(allDayRowHeightRef.current + ROW_HEIGHT_STEP * 4);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      commitAllDayRowHeight(MIN_ALL_DAY_ROW_HEIGHT);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      commitAllDayRowHeight(MAX_ALL_DAY_ROW_HEIGHT);
    }
  };

  const handleHourRowResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      commitHourRowHeight(hourRowHeightRef.current - ROW_HEIGHT_STEP);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      commitHourRowHeight(hourRowHeightRef.current + ROW_HEIGHT_STEP);
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      commitHourRowHeight(hourRowHeightRef.current - ROW_HEIGHT_STEP * 4);
      return;
    }

    if (event.key === "PageDown") {
      event.preventDefault();
      commitHourRowHeight(hourRowHeightRef.current + ROW_HEIGHT_STEP * 4);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      commitHourRowHeight(MIN_HOUR_ROW_HEIGHT);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      commitHourRowHeight(MAX_HOUR_ROW_HEIGHT);
    }
  };

  const handleAllDayRowResizeReset = () => {
    commitAllDayRowHeight(DEFAULT_ALL_DAY_ROW_HEIGHT);
  };

  const handleHourRowResizeReset = () => {
    commitHourRowHeight(DEFAULT_HOUR_ROW_HEIGHT);
  };

  const handleViewModeChange = (nextViewMode: CalendarViewMode) => {
    if (nextViewMode === selectedViewMode) {
      return;
    }

    setSelectedViewMode(nextViewMode);
    setIsRangeDaysMenuOpen(false);
    resetTimelinePosition();

    if (nextViewMode === "month") {
      setMonthTitleDate(startOfMonth(currentDate));
      requestMonthScrollTarget();
    }

    scheduleRenderedViewMode(nextViewMode);
  };

  const handleRangeDaysChange = (nextRangeDays: number) => {
    const clampedRangeDays = clampRangeDays(nextRangeDays);

    if (clampedRangeDays === rangeDays) {
      return;
    }

    resetTimelinePosition();
    writeStoredRangeDays(clampedRangeDays);
    setRangeDays(clampedRangeDays);
  };

  const handleToday = () => {
    const today = new Date();

    resetTimelinePosition();
    setCurrentDate(today);

    if (selectedViewMode === "month") {
      setMonthTitleDate(startOfMonth(today));
      requestMonthScrollTarget();
    }
  };

  const handlePrevious = () => {
    resetTimelinePosition();

    if (selectedViewMode === "month") {
      const nextMonth = subMonths(monthTitleDate, MONTH_NAVIGATION_STEP);
      setMonthTitleDate(startOfMonth(nextMonth));
      setCurrentDate(startOfDay(nextMonth));
      requestMonthScrollTarget();
      return;
    }

    setCurrentDate((prev) => subDays(prev, dayNavigationStep));
  };

  const handleNext = () => {
    resetTimelinePosition();

    if (selectedViewMode === "month") {
      const nextMonth = addMonths(monthTitleDate, MONTH_NAVIGATION_STEP);
      setMonthTitleDate(startOfMonth(nextMonth));
      setCurrentDate(startOfDay(nextMonth));
      requestMonthScrollTarget();
      return;
    }

    setCurrentDate((prev) => addDays(prev, dayNavigationStep));
  };

  const handleMonthDateSelect = useCallback(
    (date: Date) => {
      resetTimelinePosition();
      setCurrentDate(date);
      setMonthTitleDate(startOfMonth(date));
    },
    [resetTimelinePosition],
  );

  const handleVisibleMonthChange = useCallback((date: Date) => {
    setMonthTitleDate((current) =>
      isSameMonth(current, date) ? current : startOfMonth(date),
    );
  }, []);

  const calendarToolbarMode: CalendarToolbarMode =
    selectedViewMode === "month" ? "calendar" : "timeline";

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#fbfbfa] text-[#24231f]">
      <CalendarWorkspaceToolbar
        activeMode={calendarToolbarMode}
        onSelectCalendar={() => handleViewModeChange("month")}
        onSelectTimeline={() => handleViewModeChange("week")}
      />
      <header className="flex h-[84px] shrink-0 items-center gap-4 border-b border-[#dddcd5] bg-[rgba(255,255,255,0.96)] px-5 shadow-[0_1px_0_rgba(255,255,255,0.72)_inset]">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-semibold tracking-[-0.035em] text-[#24231f]">
              {monthLabel}
            </h1>
          </div>

          <div className="hidden h-10 items-center rounded-[10px] border border-[#dddcd5] bg-[#f1f0ec] p-1 shadow-[inset_0_1px_2px_rgba(86,72,74,0.08)] md:flex">
            {VIEW_MODE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "h-8 rounded-[8px] px-4 text-[13px] font-medium transition-colors",
                  selectedViewMode === item.value
                    ? "bg-white text-[#24231f] shadow-[0_1px_4px_rgba(15,23,42,0.12)]"
                    : "text-[#777671] hover:text-[#33322f]",
                )}
                onClick={() => handleViewModeChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {selectedViewMode === "days" ? (
            <div ref={rangeDaysMenuRef} className="relative hidden md:block">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isRangeDaysMenuOpen}
                aria-label="日数を選択"
                title="日数を選択"
                className="flex h-10 items-center overflow-hidden rounded-[10px] border border-[#dddcd5] bg-[#f6f6f4] text-[13px] font-semibold text-[#33322f] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setIsRangeDaysMenuOpen((current) => !current);
                }}
              >
                <span className="min-w-[56px] px-4 text-center tabular-nums">
                  {rangeDays}
                </span>
                <span className="h-full border-l border-[#dddcd5] px-3 leading-10 text-[#777671]">
                  日
                </span>
              </button>

              {isRangeDaysMenuOpen ? (
                <div
                  role="menu"
                  aria-label="日数を選択"
                  className="absolute left-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-[10px] border border-[#dddcd5] bg-white p-1 shadow-[0_16px_34px_rgba(15,23,42,0.12),0_4px_10px_rgba(15,23,42,0.08)]"
                >
                  {RANGE_DAY_OPTIONS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      role="menuitemradio"
                      aria-checked={rangeDays === days}
                      className={cn(
                        "flex h-8 w-full items-center justify-center rounded-[7px] text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        rangeDays === days
                          ? "bg-[#ef5555] text-white shadow-[0_6px_14px_rgba(239,85,85,0.22)]"
                          : "text-[#33322f] hover:bg-[#f4f3ef]",
                      )}
                      onClick={() => {
                        handleRangeDaysChange(days);
                        setIsRangeDaysMenuOpen(false);
                      }}
                    >
                      {days}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex h-10 shrink-0 items-center rounded-[10px] border border-[#dddcd5] bg-[#f6f6f4] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#777671] transition-colors hover:bg-white hover:text-[#24231f]"
            aria-label="前へ"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="h-8 rounded-[8px] px-4 text-[13px] font-semibold text-[#33322f] transition-colors hover:bg-white"
            onClick={handleToday}
          >
            今日
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#777671] transition-colors hover:bg-white hover:text-[#24231f]"
            aria-label="次へ"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {onClose ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#dddcd5] bg-[#f6f6f4] text-[#777671] transition-colors hover:bg-white hover:text-[#24231f]"
            aria-label="カレンダーを閉じる"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <div
        ref={contentViewportRef}
        className="calendar-view-content flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      >
        {renderedViewMode === "month" ? (
          <ExplorerCalendarMonthView
            currentDate={monthTitleDate}
            selectedDate={currentDate}
            scrollTargetToken={monthScrollTargetToken}
            onSelectDate={handleMonthDateSelect}
            onVisibleMonthChange={handleVisibleMonthChange}
          />
        ) : (
          <div
            ref={scrollContainerRef}
            className="calendar-timeline-scroll min-h-0 flex-1 overflow-auto bg-white"
            onScroll={handleTimelineScroll}
          >
            <div
              ref={timelineGridRef}
              className="calendar-timeline-grid grid"
              style={timelineGridStyle}
            >
              <div className="sticky left-0 top-0 z-30 border-b border-r border-[#e8e7e1] bg-white" />

              {visibleDays.map((day) => {
                const selected = isSameDay(day, currentDate);
                const today = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "sticky top-0 z-20 flex h-[56px] items-center justify-center gap-2 border-b border-r border-[#e8e7e1] bg-white text-[13px]",
                      selected && "bg-[#fff8f8]",
                    )}
                  >
                    <span className="font-semibold text-[#9b9a94]">
                      {WEEKDAY_LABELS[day.getDay()]}
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-bold tabular-nums",
                        selected
                          ? "bg-[#ef5555] text-white shadow-[0_5px_14px_rgba(239,85,85,0.28)]"
                          : today
                            ? "bg-[#f0efea] text-[#24231f]"
                            : "text-[#33322f]",
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}

              <div className="calendar-all-day-row calendar-all-day-label-row sticky left-0 z-10 flex items-center justify-center border-b border-r border-[#e8e7e1] bg-white text-[12px] font-semibold text-[#9b9a94]">
                終日
                <div
                  role="separator"
                  aria-label="終日行の高さを調整"
                  aria-orientation="horizontal"
                  aria-valuemin={MIN_ALL_DAY_ROW_HEIGHT}
                  aria-valuemax={MAX_ALL_DAY_ROW_HEIGHT}
                  aria-valuenow={allDayRowHeight}
                  tabIndex={0}
                  className="calendar-all-day-boundary-resize-handle"
                  title="ドラッグで終日行の高さを変更。ダブルクリックで初期値に戻します。"
                  onDoubleClick={handleAllDayRowResizeReset}
                  onKeyDown={handleAllDayRowResizeKeyDown}
                  onPointerDown={handleAllDayRowResizePointerDown}
                />
              </div>

              {visibleDays.map((day) => (
                <div
                  key={`allday-${day.toISOString()}`}
                  className={cn(
                    "calendar-all-day-row relative border-b border-r border-[#e8e7e1]",
                    isSameDay(day, currentDate) && "bg-[#fff8f8]",
                  )}
                />
              ))}

              <div className="sticky left-0 z-10 bg-white">
                {HOURS.map((hour) => (
                  <div
                    key={`hour-label-${hour}`}
                    className="calendar-hour-row calendar-hour-label-row relative flex justify-center border-b border-r border-[#e8e7e1] pt-2 text-[12px] text-[#8b8a84]"
                  >
                    {createHourLabel(hour)}
                    <div
                      role="separator"
                      aria-label="1時間の高さを調整"
                      aria-orientation="horizontal"
                      aria-valuemin={MIN_HOUR_ROW_HEIGHT}
                      aria-valuemax={MAX_HOUR_ROW_HEIGHT}
                      aria-valuenow={hourRowHeight}
                      tabIndex={0}
                      className="calendar-hour-boundary-resize-handle"
                      title="ドラッグで1時間の高さを変更。ダブルクリックで初期値に戻します。"
                      onDoubleClick={handleHourRowResizeReset}
                      onKeyDown={handleHourRowResizeKeyDown}
                      onPointerDown={handleHourRowResizePointerDown}
                    />
                  </div>
                ))}
              </div>

              {visibleDays.map((day) => {
                const events = demoEvents.filter((event) =>
                  isSameDay(event.startsAt, day),
                );

                return (
                  <div
                    key={`day-body-${day.toISOString()}`}
                    className={cn(
                      "relative border-r border-[#e8e7e1]",
                      isSameDay(day, currentDate) && "bg-[#fff8f8]",
                    )}
                  >
                    {HOURS.map((hour) => (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className="calendar-hour-row border-b border-[#e8e7e1]"
                      />
                    ))}

                    {events.map((event) => (
                      <article
                        key={event.id}
                        style={calculateEventStyle(event)}
                        className="calendar-event-card absolute left-2 right-2 overflow-hidden rounded-[10px] border border-[#f2c4c0] bg-[#fff1f0] px-2.5 py-2 text-[#7f2d28] shadow-[0_8px_18px_rgba(127,45,40,0.08)]"
                      >
                        <div className="truncate text-[12px] font-bold leading-4">
                          {event.title}
                        </div>
                        <div className="mt-0.5 text-[10px] font-medium tabular-nums opacity-70">
                          {format(event.startsAt, "HH:mm")}
                        </div>
                      </article>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
