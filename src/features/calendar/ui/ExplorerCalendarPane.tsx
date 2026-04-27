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
import { ChevronLeft, ChevronRight, X } from "@/ui/icons";
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
  return Math.min(
    MAX_RANGE_DAYS,
    Math.max(MIN_RANGE_DAYS, Math.round(value)),
  );
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

  window.localStorage.setItem(storageKey, String(normalizeStoredRowHeight(value)));
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
  const startHour = event.startsAt.getHours() + event.startsAt.getMinutes() / 60;

  return {
    "--calendar-event-start-hour": Math.max(0, startHour - HOURS[0]),
    "--calendar-event-duration-hours": event.minutes / 60,
  };
};

export const ExplorerCalendarPane = ({ onClose }: ExplorerCalendarPaneProps) => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
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
    viewportWidth > 0 ? viewportWidth : (contentViewportRef.current?.clientWidth ?? 0);
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

  const scheduleRenderedViewMode = useCallback((nextViewMode: CalendarViewMode) => {
    if (renderModeFrameRef.current !== null) {
      window.cancelAnimationFrame(renderModeFrameRef.current);
    }

    renderModeFrameRef.current = window.requestAnimationFrame(() => {
      renderModeFrameRef.current = null;
      setRenderedViewMode(nextViewMode);
    });
  }, []);

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
    applyTimelineRowHeightVariable(
      "--calendar-hour-row-height",
      hourRowHeight,
    );
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

  const handleHourRowResizeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
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

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#fbfbfa] text-[#24231f]">
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
            <label className="hidden h-10 items-center overflow-hidden rounded-[10px] border border-[#dddcd5] bg-[#f6f6f4] text-[13px] font-semibold text-[#33322f] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] transition-colors hover:bg-white md:flex">
              <select
                aria-label="日数を選択"
                title="日数を選択"
                value={rangeDays}
                className="h-full cursor-pointer appearance-none bg-transparent px-4 text-center tabular-nums text-[#33322f] outline-none"
                onChange={(event) => {
                  handleRangeDaysChange(Number(event.target.value));
                }}
              >
                {RANGE_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days}
                  </option>
                ))}
              </select>
              <span className="h-full border-l border-[#dddcd5] px-3 leading-10 text-[#777671]">
                日
              </span>
            </label>
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
