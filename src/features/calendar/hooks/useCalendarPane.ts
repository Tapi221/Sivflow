import {
  addDays,
  addMonths,
  endOfMonth,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import type { CSSProperties, UIEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import {
  buildTimelineColumns,
  getTimelineAnchorColumnIndex,
  getTimelineColumnWidth,
} from "@/features/calendar/TimelineDayView.shared";
import type { TimelineUnitBuffer } from "@/features/calendar/TimelineDayView.shared";
import { useGoogleCalendarIntegration } from "@/features/calendar/hooks/useGoogleCalendarIntegration";

import type {
  CalendarToolbarMode,
  CalendarViewMode,
  TimelineBufferDays,
  TimelineGridStyle,
} from "../calendarPane.types";

// ── 純粋ユーティリティ関数群

const createInitialCalendarBuffer = (): TimelineBufferDays => ({
  before: C.INITIAL_CALENDAR_BUFFER_DAYS,
  after: C.INITIAL_CALENDAR_BUFFER_DAYS,
});

const createInitialTimelineUnitBuffer = (
  viewMode: CalendarViewMode,
): TimelineUnitBuffer => {
  if (viewMode === "month") return { before: 3, after: 8 };
  if (viewMode === "week") return { before: 4, after: 8 };
  return { before: 7, after: 14 };
};

const getTimelineUnitExtendCount = (viewMode: CalendarViewMode) => {
  if (viewMode === "month") return 3;
  if (viewMode === "week") return 4;
  return 7;
};

const getRangeDayCount = (baseDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return getDaysInMonth(baseDate);
  return viewMode === "week" ? 7 : 1;
};

const getViewportDayCount = (baseDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return 7;
  return getRangeDayCount(baseDate, viewMode);
};

const createVisibleDays = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  buffer: TimelineBufferDays,
): Date[] => {
  const normalized = startOfDay(baseDate);
  const startDate =
    viewMode === "month"
      ? startOfMonth(normalized)
      : viewMode === "week"
        ? startOfWeek(normalized, { weekStartsOn: C.WEEK_STARTS_ON_MONDAY })
        : normalized;
  const visibleCount = getRangeDayCount(normalized, viewMode);
  const timelineStart = subDays(startDate, buffer.before);
  const totalCount = buffer.before + visibleCount + buffer.after;
  return Array.from({ length: totalCount }, (_, i) =>
    addDays(timelineStart, i),
  );
};

const getNextDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return addMonths(current, 1);
  if (viewMode === "week") return addDays(current, 7);
  return addDays(current, 1);
};

const getPreviousDate = (current: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return subMonths(current, 1);
  if (viewMode === "week") return subDays(current, 7);
  return subDays(current, 1);
};

// ── フック本体

export type UseCalendarPaneReturn = {
  // Refs
  contentViewportRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  // State
  currentDate: Date;
  monthTitleDate: Date;
  monthScrollTargetToken: number;
  selectedViewMode: CalendarViewMode;
  activeMode: CalendarToolbarMode;
  setActiveMode: (mode: CalendarToolbarMode) => void;
  // Computed
  visibleDays: Date[];
  timelineColumns: ReturnType<typeof buildTimelineColumns>;
  timelineColumnWidth: number;
  timelineAnchorColumnIndex: number;
  titleDate: Date;
  monthLabel: string | null;
  calendarDayColumnWidth: number;
  timelineGridStyle: CSSProperties & { "--calendar-hour-row-height": string };
  // Google Calendar
  googleAccountEmail: string | null;
  googleCalendars: ReturnType<typeof useGoogleCalendarIntegration>["calendars"];
  googleCalendarError: string | null;
  googleCalendarEvents: ReturnType<
    typeof useGoogleCalendarIntegration
  >["events"];
  isGoogleCalendarConnected: boolean;
  isGoogleCalendarConnecting: boolean;
  selectedCalendarIds: Set<string>;
  connectGoogleCalendar: () => Promise<void>;
  toggleGoogleCalendar: (id: string) => void;
  // Handlers
  handleTimelineScroll: (event: UIEvent<HTMLDivElement>) => void;
  handleSelectViewMode: (viewMode: CalendarViewMode) => void;
  handleToday: () => void;
  handlePrevious: () => void;
  handleNext: () => void;
  handleSidebarPreviousMonth: () => void;
  handleSidebarNextMonth: () => void;
  handleSidebarSelectDate: (date: Date) => void;
  setIsCalendarSidebarOpen: (open: boolean) => void;
  setMonthTitleDate: (date: Date) => void;
};

export const useCalendarPane = (): UseCalendarPaneReturn => {
  // ── DOM Refs
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const prependScrollCorrectionRef = useRef(0);
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);
  const shouldSyncScrollRef = useRef(true);

  // ── State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [monthTitleDate, setMonthTitleDate] = useState(() =>
    startOfMonth(new Date()),
  );
  const [monthScrollTargetToken, setMonthScrollTargetToken] = useState(0);
  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewMode>("days");
  const [activeMode, setActiveMode] = useState<CalendarToolbarMode>("timeline");
  const [isCalendarSidebarOpen, setIsCalendarSidebarOpen] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [calendarBuffer, setCalendarBuffer] = useState(
    createInitialCalendarBuffer,
  );
  const [timelineUnitBuffer, setTimelineUnitBuffer] = useState(() =>
    createInitialTimelineUnitBuffer("days"),
  );

  // ── Google Calendar
  const {
    accountEmail: googleAccountEmail,
    calendars: googleCalendars,
    connect: connectGoogleCalendar,
    error: googleCalendarError,
    events: googleCalendarEvents,
    isConnected: isGoogleCalendarConnected,
    isConnecting: isGoogleCalendarConnecting,
    loadEvents: loadGoogleCalendarEvents,
    selectedCalendarIds,
    selectedCalendarIdList,
    toggleCalendar: toggleGoogleCalendar,
  } = useGoogleCalendarIntegration();

  // ── Computed
  const visibleDays = useMemo(
    () => createVisibleDays(currentDate, selectedViewMode, calendarBuffer),
    [calendarBuffer, currentDate, selectedViewMode],
  );

  const timelineColumns = useMemo(
    () =>
      buildTimelineColumns(selectedViewMode, currentDate, timelineUnitBuffer),
    [currentDate, selectedViewMode, timelineUnitBuffer],
  );

  const timelineColumnWidth = useMemo(
    () => getTimelineColumnWidth(selectedViewMode, C.TIMELINE_DAY_COLUMN_WIDTH),
    [selectedViewMode],
  );

  const timelineAnchorColumnIndex = useMemo(
    () => getTimelineAnchorColumnIndex(timelineColumns, currentDate),
    [currentDate, timelineColumns],
  );

  const titleDate = selectedViewMode === "month" ? monthTitleDate : currentDate;
  const monthLabel =
    activeMode === "timeline" && selectedViewMode === "month"
      ? null
      : new Intl.DateTimeFormat("en-US", {
          month: "long",
          year: "numeric",
        }).format(titleDate);

  const viewportDayCount = getViewportDayCount(currentDate, selectedViewMode);

  const calendarDayColumnWidth =
    viewportWidth > C.TIME_COLUMN_WIDTH
      ? Math.max(
          1,
          (viewportWidth - C.TIME_COLUMN_WIDTH) / Math.max(1, viewportDayCount),
        )
      : C.DAY_COLUMN_MIN_WIDTH;

  const gridWidth =
    C.TIME_COLUMN_WIDTH + visibleDays.length * calendarDayColumnWidth;

  const timelineGridStyle: TimelineGridStyle = {
    "--calendar-hour-row-height": `${C.DEFAULT_HOUR_ROW_HEIGHT}px`,
    gridTemplateColumns: `${C.TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, ${calendarDayColumnWidth}px)`,
    minWidth: `${gridWidth}px`,
  };

  // ── Effects

  useEffect(() => {
    if (activeMode === "calendar" && selectedViewMode === "month") {
      // 月表示：スクロールで変化する monthTitleDate を基準に前後1ヶ月分を取得
      // （前後1ヶ月バッファを持つことでスクロール時のちらつきを抑える）
      const rangeStart = startOfMonth(addMonths(monthTitleDate, -1));
      const rangeEnd = endOfMonth(addMonths(monthTitleDate, 1));
      void loadGoogleCalendarEvents(rangeStart, rangeEnd);
    } else {
      // 週・日表示 / タイムライン：visibleDays を基準に取得
      const rangeStart = visibleDays[0];
      const rangeEnd = visibleDays[visibleDays.length - 1];
      if (!rangeStart || !rangeEnd) return;
      void loadGoogleCalendarEvents(rangeStart, rangeEnd);
    }
  }, [
    activeMode,
    loadGoogleCalendarEvents,
    monthTitleDate,
    selectedCalendarIdList,
    selectedViewMode,
    visibleDays,
  ]);

  useEffect(() => {
    const viewport = contentViewportRef.current;
    if (!viewport) return;
    const update = () => setViewportWidth(viewport.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    if (prependScrollCorrectionRef.current > 0) {
      scroller.scrollLeft += prependScrollCorrectionRef.current;
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scroller.scrollLeft;
      }
      prependScrollCorrectionRef.current = 0;
      isExtendingLeftRef.current = false;
      return;
    }

    if (!shouldSyncScrollRef.current) return;

    const nextScrollLeft =
      activeMode === "timeline"
        ? timelineAnchorColumnIndex * timelineColumnWidth
        : calendarBuffer.before * calendarDayColumnWidth;

    scroller.scrollLeft = nextScrollLeft;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = nextScrollLeft;
    }
    shouldSyncScrollRef.current = false;
  }, [
    activeMode,
    calendarBuffer.before,
    calendarDayColumnWidth,
    timelineAnchorColumnIndex,
    timelineColumnWidth,
    timelineColumns.length,
    visibleDays.length,
  ]);

  useLayoutEffect(() => {
    isExtendingRightRef.current = false;
  }, [calendarBuffer.after, timelineUnitBuffer.after]);

  // ── Internal helpers

  const resetTimelinePosition = useCallback((viewMode: CalendarViewMode) => {
    shouldSyncScrollRef.current = true;
    setCalendarBuffer(createInitialCalendarBuffer());
    setTimelineUnitBuffer(createInitialTimelineUnitBuffer(viewMode));
  }, []);

  const requestMonthScrollTarget = useCallback(() => {
    setMonthScrollTargetToken((n) => n + 1);
  }, []);

  // ── Public handlers

  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget;

      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scroller.scrollLeft;
      }

      const distLeft = scroller.scrollLeft;
      const distRight =
        scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;

      if (
        distLeft < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;
        if (activeMode === "timeline") {
          const extendCount = getTimelineUnitExtendCount(selectedViewMode);
          prependScrollCorrectionRef.current =
            extendCount * timelineColumnWidth;
          setTimelineUnitBuffer((c) => ({
            ...c,
            before: c.before + extendCount,
          }));
        } else {
          prependScrollCorrectionRef.current =
            C.CALENDAR_EXTEND_DAYS * calendarDayColumnWidth;
          setCalendarBuffer((c) => ({
            ...c,
            before: c.before + C.CALENDAR_EXTEND_DAYS,
          }));
        }
      }

      if (
        distRight < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;
        if (activeMode === "timeline") {
          const extendCount = getTimelineUnitExtendCount(selectedViewMode);
          setTimelineUnitBuffer((c) => ({
            ...c,
            after: c.after + extendCount,
          }));
        } else {
          setCalendarBuffer((c) => ({
            ...c,
            after: c.after + C.CALENDAR_EXTEND_DAYS,
          }));
        }
      }
    },
    [activeMode, calendarDayColumnWidth, selectedViewMode, timelineColumnWidth],
  );

  const handleSelectViewMode = useCallback(
    (nextViewMode: CalendarViewMode) => {
      setSelectedViewMode(nextViewMode);
      if (nextViewMode === "month") {
        setMonthTitleDate(startOfMonth(currentDate));
        requestMonthScrollTarget();
      }
      resetTimelinePosition(nextViewMode);
    },
    [currentDate, requestMonthScrollTarget, resetTimelinePosition],
  );

  const handleToday = useCallback(() => {
    const next = new Date();
    setCurrentDate(next);
    setMonthTitleDate(startOfMonth(next));
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [requestMonthScrollTarget, resetTimelinePosition, selectedViewMode]);

  const handlePrevious = useCallback(() => {
    setCurrentDate((c) => {
      const next = getPreviousDate(c, selectedViewMode);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [requestMonthScrollTarget, resetTimelinePosition, selectedViewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((c) => {
      const next = getNextDate(c, selectedViewMode);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [requestMonthScrollTarget, resetTimelinePosition, selectedViewMode]);

  const handleSidebarPreviousMonth = useCallback(() => {
    setCurrentDate((c) => {
      const next = subMonths(c, 1);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [requestMonthScrollTarget, resetTimelinePosition, selectedViewMode]);

  const handleSidebarNextMonth = useCallback(() => {
    setCurrentDate((c) => {
      const next = addMonths(c, 1);
      setMonthTitleDate(startOfMonth(next));
      return next;
    });
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  }, [requestMonthScrollTarget, resetTimelinePosition, selectedViewMode]);

  const handleSidebarSelectDate = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      setMonthTitleDate(startOfMonth(date));
      if (selectedViewMode === "month") requestMonthScrollTarget();
      resetTimelinePosition(selectedViewMode);
    },
    [requestMonthScrollTarget, resetTimelinePosition, selectedViewMode],
  );

  return {
    contentViewportRef,
    scrollContainerRef,
    headerScrollRef,
    currentDate,
    monthTitleDate,
    monthScrollTargetToken,
    selectedViewMode,
    activeMode,
    isCalendarSidebarOpen,
    setActiveMode,
    visibleDays,
    timelineColumns,
    timelineColumnWidth,
    timelineAnchorColumnIndex,
    titleDate,
    monthLabel,
    calendarDayColumnWidth,
    timelineGridStyle,
    googleAccountEmail,
    googleCalendars,
    googleCalendarError,
    googleCalendarEvents,
    isGoogleCalendarConnected,
    isGoogleCalendarConnecting,
    selectedCalendarIds,
    connectGoogleCalendar,
    toggleGoogleCalendar,
    handleTimelineScroll,
    handleSelectViewMode,
    handleToday,
    handlePrevious,
    handleNext,
    handleSidebarPreviousMonth,
    handleSidebarNextMonth,
    handleSidebarSelectDate,
    setIsCalendarSidebarOpen,
    setMonthTitleDate,
  };
};
