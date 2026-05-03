import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  isSameDay,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { CSSProperties, UIEvent } from "react";
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
} from "@/ui/icons";
import { ExplorerCalendarMonthView } from "./ExplorerCalendarMonthView";
import {
  buildTimelineColumns,
  ExplorerCalendarTimelineDayView,
  getTimelineAnchorColumnIndex,
  getTimelineColumnWidth,
  type TimelineUnitBuffer,
} from "./ExplorerCalendarTimelineDayView";

type ExplorerCalendarPaneProps = {
  onClose?: () => void;
};

export type CalendarViewMode = "month" | "week" | "days";
export type CalendarToolbarMode = "calendar" | "timeline";

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

type TimelineGridStyle = CSSProperties & {
  "--calendar-hour-row-height": string;
};

type CalendarEventStyle = CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const WEEK_STARTS_ON_MONDAY = 1;
const TIME_COLUMN_WIDTH = 74;
const DAY_COLUMN_MIN_WIDTH = 136;
const DEFAULT_HOUR_ROW_HEIGHT = 88;
const INITIAL_CALENDAR_BUFFER_DAYS = 7;
const CALENDAR_EXTEND_DAYS = 14;
const TIMELINE_EDGE_THRESHOLD_PX = 320;
const TIMELINE_DAY_COLUMN_WIDTH = 104;
const TIMELINE_LANE_LABEL_WIDTH = 168;
const TIMELINE_SKELETON_ROW_COUNT = 4;

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

export type CalendarWorkspaceToolbarProps = {
  activeMode: CalendarToolbarMode;
  viewMode?: CalendarViewMode;
  onSelectCalendar: () => void;
  onSelectTimeline: () => void;
  onSelectViewMode?: (viewMode: CalendarViewMode) => void;
};

const CALENDAR_TOOLBAR_ACTIONS = [
  { label: "Search", icon: Search },
  { label: "Filter", icon: Filter },
  { label: "Sort", icon: SortToolbarIcon },
  { label: "Fields", icon: FieldsToolbarIcon },
] as const;

const CALENDAR_VIEW_MODE_TOOLBAR_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "days", label: "Day" },
] as const satisfies Array<{ value: CalendarViewMode; label: string }>;

const createInitialCalendarBuffer = (): TimelineBufferDays => ({
  before: INITIAL_CALENDAR_BUFFER_DAYS,
  after: INITIAL_CALENDAR_BUFFER_DAYS,
});

const createInitialTimelineUnitBuffer = (
  viewMode: CalendarViewMode,
): TimelineUnitBuffer => {
  if (viewMode === "month") {
    return { before: 3, after: 8 };
  }

  if (viewMode === "week") {
    return { before: 4, after: 8 };
  }

  return { before: 7, after: 14 };
};

const getTimelineUnitExtendCount = (viewMode: CalendarViewMode) => {
  if (viewMode === "month") {
    return 3;
  }

  if (viewMode === "week") {
    return 4;
  }

  return 7;
};

export const CalendarWorkspaceToolbar = ({
  activeMode,
  viewMode,
  onSelectCalendar,
  onSelectTimeline,
  onSelectViewMode,
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
    <div className="relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 flex-wrap items-center justify-between overflow-hidden bg-white after:absolute after:bottom-1 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']">
      <div className="flex h-7 shrink-0 items-start gap-[6px]">
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

        {onSelectViewMode && viewMode ? (
          <div className="ml-3 flex h-7 shrink-0 items-center gap-1">
            {CALENDAR_VIEW_MODE_TOOLBAR_OPTIONS.map((option) => {
              const isActive = viewMode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex h-7 items-center rounded px-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal transition-colors hover:bg-[#f6f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "text-[#25272d]" : "text-[#8f929c]",
                  )}
                  aria-pressed={isActive}
                  onClick={() => onSelectViewMode(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
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

const getRangeDayCount = (
  baseDate: Date,
  viewMode: CalendarViewMode,
) => {
  if (viewMode === "month") {
    return getDaysInMonth(baseDate);
  }

  return viewMode === "week" ? 7 : 1;
};

const getViewportDayCount = (
  baseDate: Date,
  viewMode: CalendarViewMode,
) => {
  if (viewMode === "month") {
    return 7;
  }

  return getRangeDayCount(baseDate, viewMode);
};

const createVisibleDays = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  timelineBuffer: TimelineBufferDays,
) => {
  const normalizedDate = startOfDay(baseDate);
  const startDate =
    viewMode === "month"
      ? startOfMonth(normalizedDate)
      : viewMode === "week"
        ? startOfWeek(normalizedDate, { weekStartsOn: WEEK_STARTS_ON_MONDAY })
        : normalizedDate;
  const visibleDayCount = getRangeDayCount(normalizedDate, viewMode);
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
    top: `calc(var(--calendar-event-start-hour) * var(--calendar-hour-row-height) + 40px)`,
    height: `calc(var(--calendar-event-duration-hours) * var(--calendar-hour-row-height) - 8px)`,
  };
};

const getNextDate = (currentDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") {
    return addMonths(currentDate, 1);
  }

  if (viewMode === "week") {
    return addDays(currentDate, 7);
  }

  return addDays(currentDate, 1);
};

const getPreviousDate = (currentDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") {
    return subMonths(currentDate, 1);
  }

  if (viewMode === "week") {
    return subDays(currentDate, 7);
  }

  return subDays(currentDate, 1);
};

export const ExplorerCalendarPane = ({
  onClose: _onClose,
}: ExplorerCalendarPaneProps) => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prependScrollCorrectionRef = useRef(0);
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);
  const shouldSyncScrollRef = useRef(true);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [monthTitleDate, setMonthTitleDate] = useState(() =>
    startOfMonth(new Date()),
  );
  const [monthScrollTargetToken, setMonthScrollTargetToken] = useState(0);
  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewMode>("days");
  const [activeMode, setActiveMode] =
    useState<CalendarToolbarMode>("timeline");
  const [viewportWidth, setViewportWidth] = useState(0);
  const [calendarBuffer, setCalendarBuffer] = useState(
    createInitialCalendarBuffer,
  );
  const [timelineUnitBuffer, setTimelineUnitBuffer] = useState(() =>
    createInitialTimelineUnitBuffer("days"),
  );

  const visibleDays = useMemo(
    () => createVisibleDays(currentDate, selectedViewMode, calendarBuffer),
    [calendarBuffer, currentDate, selectedViewMode],
  );
  const demoEvents = useMemo(
    () => createDemoEvents(currentDate),
    [currentDate],
  );
  const timelineColumns = useMemo(() => {
    return buildTimelineColumns(
      selectedViewMode,
      currentDate,
      timelineUnitBuffer,
    );
  }, [currentDate, selectedViewMode, timelineUnitBuffer]);
  const timelineColumnWidth = useMemo(() => {
    return getTimelineColumnWidth(selectedViewMode, TIMELINE_DAY_COLUMN_WIDTH);
  }, [selectedViewMode]);
  const timelineAnchorColumnIndex = useMemo(() => {
    return getTimelineAnchorColumnIndex(timelineColumns, currentDate);
  }, [currentDate, timelineColumns]);

  const titleDate =
    selectedViewMode === "month" ? monthTitleDate : currentDate;
  const monthLabel =
    activeMode === "timeline" && selectedViewMode === "month"
      ? format(titleDate, "yyyy年", { locale: ja })
      : format(titleDate, "yyyy年 M月", { locale: ja });

  const viewportDayCount = getViewportDayCount(currentDate, selectedViewMode);
  const measuredViewportWidth =
    viewportWidth > 0
      ? viewportWidth
      : (contentViewportRef.current?.clientWidth ?? 0);
  const calendarDayColumnWidth =
    measuredViewportWidth > TIME_COLUMN_WIDTH
      ? Math.max(
          1,
          (measuredViewportWidth - TIME_COLUMN_WIDTH) /
            Math.max(1, viewportDayCount),
        )
      : DAY_COLUMN_MIN_WIDTH;

  const gridWidth =
    TIME_COLUMN_WIDTH + visibleDays.length * calendarDayColumnWidth;
  const timelineGridStyle: TimelineGridStyle = {
    "--calendar-hour-row-height": `${DEFAULT_HOUR_ROW_HEIGHT}px`,
    gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, ${calendarDayColumnWidth}px)`,
    minWidth: `${gridWidth}px`,
  };

  const resetTimelinePosition = useCallback((viewMode: CalendarViewMode) => {
    shouldSyncScrollRef.current = true;
    setCalendarBuffer(createInitialCalendarBuffer());
    setTimelineUnitBuffer(createInitialTimelineUnitBuffer(viewMode));
  }, []);

  const requestMonthScrollTarget = useCallback(() => {
    setMonthScrollTargetToken((current) => current + 1);
  }, []);

  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scrollContainer = event.currentTarget;

      const distanceToLeft = scrollContainer.scrollLeft;
      const distanceToRight =
        scrollContainer.scrollWidth -
        scrollContainer.clientWidth -
        scrollContainer.scrollLeft;

      if (
        distanceToLeft < TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;

        if (activeMode === "timeline") {
          const extendCount = getTimelineUnitExtendCount(selectedViewMode);
          prependScrollCorrectionRef.current =
            extendCount * timelineColumnWidth;

          setTimelineUnitBuffer((current) => ({
            before: current.before + extendCount,
            after: current.after,
          }));
        } else {
          prependScrollCorrectionRef.current =
            CALENDAR_EXTEND_DAYS * calendarDayColumnWidth;

          setCalendarBuffer((current) => ({
            before: current.before + CALENDAR_EXTEND_DAYS,
            after: current.after,
          }));
        }
      }

      if (
        distanceToRight < TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;

        if (activeMode === "timeline") {
          const extendCount = getTimelineUnitExtendCount(selectedViewMode);

          setTimelineUnitBuffer((current) => ({
            before: current.before,
            after: current.after + extendCount,
          }));
        } else {
          setCalendarBuffer((current) => ({
            before: current.before,
            after: current.after + CALENDAR_EXTEND_DAYS,
          }));
        }
      }
    },
    [
      activeMode,
      calendarDayColumnWidth,
      selectedViewMode,
      timelineColumnWidth,
    ],
  );

  useEffect(() => {
    const viewport = contentViewportRef.current;
    if (!viewport) {
      return undefined;
    }

    const updateViewportWidth = () => {
      setViewportWidth(viewport.clientWidth);
    };

    updateViewportWidth();

    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    if (prependScrollCorrectionRef.current > 0) {
      scrollContainer.scrollLeft += prependScrollCorrectionRef.current;
      prependScrollCorrectionRef.current = 0;
      isExtendingLeftRef.current = false;
      return;
    }

    if (!shouldSyncScrollRef.current) {
      return;
    }

    scrollContainer.scrollLeft =
      activeMode === "timeline"
        ? timelineAnchorColumnIndex * timelineColumnWidth
        : calendarBuffer.before * calendarDayColumnWidth;
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

  const handleSelectViewMode = (nextViewMode: CalendarViewMode) => {
    setSelectedViewMode(nextViewMode);
    if (nextViewMode === "month") {
      setMonthTitleDate(startOfMonth(currentDate));
      requestMonthScrollTarget();
    }
    resetTimelinePosition(nextViewMode);
  };

  const handleToday = () => {
    const nextDate = new Date();
    setCurrentDate(nextDate);
    setMonthTitleDate(startOfMonth(nextDate));

    if (selectedViewMode === "month") {
      requestMonthScrollTarget();
    }

    resetTimelinePosition(selectedViewMode);
  };

  const handlePrevious = () => {
    setCurrentDate((current) => {
      const nextDate = getPreviousDate(current, selectedViewMode);
      setMonthTitleDate(startOfMonth(nextDate));
      return nextDate;
    });

    if (selectedViewMode === "month") {
      requestMonthScrollTarget();
    }

    resetTimelinePosition(selectedViewMode);
  };

  const handleNext = () => {
    setCurrentDate((current) => {
      const nextDate = getNextDate(current, selectedViewMode);
      setMonthTitleDate(startOfMonth(nextDate));
      return nextDate;
    });

    if (selectedViewMode === "month") {
      requestMonthScrollTarget();
    }

    resetTimelinePosition(selectedViewMode);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <CalendarWorkspaceToolbar
        activeMode={activeMode}
        viewMode={selectedViewMode}
        onSelectCalendar={() => setActiveMode("calendar")}
        onSelectTimeline={() => setActiveMode("timeline")}
        onSelectViewMode={handleSelectViewMode}
      />

      <div
        ref={contentViewportRef}
        className="flex min-h-0 flex-1 flex-col bg-white px-5 pb-5 pt-4"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="text-[16px] font-semibold text-[#24272f]">
            {monthLabel}
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc]"
              onClick={handlePrevious}
              aria-label="前へ"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="rounded-lg border border-[#dde2ea] bg-white px-4 py-[7px] text-[14px] font-semibold text-[#20242c] transition-colors hover:bg-[#f8fafc]"
              onClick={handleToday}
            >
              今日
            </button>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc]"
              onClick={handleNext}
              aria-label="次へ"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {activeMode === "timeline" ? (
          <ExplorerCalendarTimelineDayView
            viewMode={selectedViewMode}
            anchorDate={currentDate}
            timelineUnitBuffer={timelineUnitBuffer}
            selectedDate={currentDate}
            dayColumnWidth={TIMELINE_DAY_COLUMN_WIDTH}
            laneLabelWidth={TIMELINE_LANE_LABEL_WIDTH}
            rowCount={TIMELINE_SKELETON_ROW_COUNT}
            scrollContainerRef={scrollContainerRef}
            onScroll={handleTimelineScroll}
            onSelectDate={setCurrentDate}
          />
        ) : selectedViewMode === "month" ? (
          <ExplorerCalendarMonthView
            currentDate={currentDate}
            selectedDate={currentDate}
            scrollTargetToken={monthScrollTargetToken}
            onSelectDate={setCurrentDate}
            onVisibleMonthChange={setMonthTitleDate}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
              onScroll={handleTimelineScroll}
            >
              <div className="grid" style={timelineGridStyle}>
                <div className="sticky left-0 top-0 z-20 border-b border-r border-[#e5e7eb] bg-white" />
                {visibleDays.map((day) => {
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "sticky top-0 z-10 flex h-10 flex-col items-center justify-center border-b border-r border-[#e5e7eb] bg-white text-[12px] font-medium text-[#4c5361] last:border-r-0",
                        isToday && "bg-[#fdf2f2]",
                      )}
                    >
                      <span className="font-semibold text-[#25272d]">
                        {format(day, "d", { locale: ja })}
                      </span>
                      <span>{format(day, "E", { locale: ja })}</span>
                    </div>
                  );
                })}

                <div className="sticky left-0 z-10 border-r border-[#e5e7eb] bg-white">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="flex items-start justify-center border-b border-[#eef0f3] pt-2 text-[12px] text-[#8f929c]"
                      style={{ height: `var(--calendar-hour-row-height)` }}
                    >
                      {createHourLabel(hour)}
                    </div>
                  ))}
                </div>

                {visibleDays.map((day) => {
                  const eventsForDay = demoEvents.filter((event) =>
                    isSameDay(event.startsAt, day),
                  );

                  return (
                    <div
                      key={`${day.toISOString()}-column`}
                      className="relative border-r border-[#eef0f3] last:border-r-0"
                    >
                      {HOURS.map((hour) => (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className="border-b border-[#eef0f3]"
                          style={{ height: `var(--calendar-hour-row-height)` }}
                        />
                      ))}

                      {eventsForDay.map((event) => (
                        <div
                          key={event.id}
                          className="absolute left-2 right-2 rounded-md border border-[#bfd3ff] bg-[#dceaff] px-2 py-1 text-[12px] font-medium text-[#2c3440] shadow-sm"
                          style={calculateEventStyle(event)}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
