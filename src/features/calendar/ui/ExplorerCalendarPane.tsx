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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
import {
  ExplorerCalendarTimelineDayView,
  type TimelineDayBar,
  type TimelineDayLane,
} from "./ExplorerCalendarTimelineDayView";

type ExplorerCalendarPaneProps = {
  onClose?: () => void;
};

export type CalendarViewMode = "month" | "week" | "days";
export type CalendarToolbarMode = "calendar" | "timeline";

export type CalendarWorkspaceToolbarProps = {
  activeMode: CalendarToolbarMode;
  viewMode?: CalendarViewMode;
  onSelectCalendar: () => void;
  onSelectTimeline: () => void;
  onSelectViewMode?: (viewMode: CalendarViewMode) => void;
};

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
  "--calendar-all-day-row-height": string;
  "--calendar-hour-row-height": string;
};

type CalendarEventStyle = CSSProperties & {
  top: string;
  height: string;
};

const MIN_RANGE_DAYS = 1;
const MAX_RANGE_DAYS = 6;
const DEFAULT_RANGE_DAYS = 3;
const DEFAULT_ALL_DAY_ROW_HEIGHT = 46;
const DEFAULT_HOUR_ROW_HEIGHT = 72;
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const WEEK_STARTS_ON_MONDAY = 1;
const TIME_COLUMN_WIDTH = 74;
const DAY_COLUMN_MIN_WIDTH = 136;
const TIMELINE_DAY_COLUMN_WIDTH = 104;
const TIMELINE_LANE_LABEL_WIDTH = 168;
const INITIAL_TIMELINE_BUFFER_DAYS = 7;
const TIMELINE_EXTEND_DAYS = 14;
const TIMELINE_EDGE_THRESHOLD_PX = 320;
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

const createInitialTimelineBuffer = (): TimelineBufferDays => ({
  before: INITIAL_TIMELINE_BUFFER_DAYS,
  after: INITIAL_TIMELINE_BUFFER_DAYS,
});

const clampRangeDays = (value: number) => {
  return Math.min(MAX_RANGE_DAYS, Math.max(MIN_RANGE_DAYS, Math.round(value)));
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

const calculateEventStyle = (
  event: CalendarDemoEvent,
  hourRowHeight: number,
): CalendarEventStyle => {
  const startHour = event.startsAt.getHours() + event.startsAt.getMinutes() / 60;
  const top = startHour * hourRowHeight + 8;

  return {
    top: `${top}px`,
    height: `${Math.max(28, (event.minutes / 60) * hourRowHeight - 12)}px`,
  };
};

const createDemoTimelineLanes = (): TimelineDayLane[] => {
  return [
    {
      id: "study",
      label: "学習タスク",
      countLabel: "3件",
      dotColorClassName: "bg-[#6ea8ff]",
    },
    {
      id: "review",
      label: "復習スケジュール",
      countLabel: "2件",
      dotColorClassName: "bg-[#7bc96f]",
    },
    {
      id: "project",
      label: "プロジェクト",
      countLabel: "2件",
      dotColorClassName: "bg-[#9a7cff]",
    },
    {
      id: "personal",
      label: "個人タスク",
      countLabel: "2件",
      dotColorClassName: "bg-[#ff9b45]",
    },
  ];
};

const createDemoTimelineBars = (): TimelineDayBar[] => {
  return [
    {
      id: "study-1",
      laneId: "study",
      title: "英単語デッキAを学習",
      startDayIndex: 2,
      span: 4,
      colorClassName: "border-[#9bc2ff] bg-[#dceaff]",
    },
    {
      id: "study-2",
      laneId: "study",
      title: "数学公式の暗記",
      startDayIndex: 6,
      span: 5,
      colorClassName: "border-[#9bc2ff] bg-[#dceaff]",
    },
    {
      id: "study-3",
      laneId: "study",
      title: "世界史の年表整理",
      startDayIndex: 13,
      span: 3,
      colorClassName: "border-[#9bc2ff] bg-[#dceaff]",
    },
    {
      id: "review-1",
      laneId: "review",
      title: "英単語デッキA 復習",
      startDayIndex: 2,
      span: 3,
      colorClassName: "border-[#a8d89a] bg-[#e2f2d9]",
    },
    {
      id: "review-2",
      laneId: "review",
      title: "数学公式 復習",
      startDayIndex: 7,
      span: 6,
      colorClassName: "border-[#a8d89a] bg-[#e2f2d9]",
    },
    {
      id: "project-1",
      laneId: "project",
      title: "卒論リサーチ",
      startDayIndex: 3,
      span: 5,
      colorClassName: "border-[#b7a8ff] bg-[#ebe5ff]",
    },
    {
      id: "project-2",
      laneId: "project",
      title: "プレゼン資料作成",
      startDayIndex: 9,
      span: 5,
      colorClassName: "border-[#b7a8ff] bg-[#ebe5ff]",
    },
    {
      id: "personal-1",
      laneId: "personal",
      title: "部屋の片付け",
      startDayIndex: 2,
      span: 2,
      colorClassName: "border-[#ffb36b] bg-[#ffe8d3]",
    },
    {
      id: "personal-2",
      laneId: "personal",
      title: "買い物",
      startDayIndex: 6,
      span: 3,
      colorClassName: "border-[#ffb36b] bg-[#ffe8d3]",
    },
    {
      id: "personal-3",
      laneId: "personal",
      title: "運動する",
      startDayIndex: 15,
      span: 2,
      colorClassName: "border-[#ffb36b] bg-[#ffe8d3]",
    },
  ];
};

export const ExplorerCalendarPane = ({ onClose }: ExplorerCalendarPaneProps) => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineGridRef = useRef<HTMLDivElement | null>(null);
  const prependScrollCorrectionRef = useRef(0);
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);
  const shouldSyncScrollRef = useRef(true);

  const [activeMode, setActiveMode] =
    useState<CalendarToolbarMode>("calendar");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [monthTitleDate, setMonthTitleDate] = useState(() =>
    startOfMonth(new Date()),
  );
  const [monthScrollTargetToken, setMonthScrollTargetToken] = useState(0);
  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewMode>("month");
  const [rangeDays] = useState(DEFAULT_RANGE_DAYS);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [timelineBuffer, setTimelineBuffer] = useState(
    createInitialTimelineBuffer,
  );
  const [allDayRowHeight] = useState(DEFAULT_ALL_DAY_ROW_HEIGHT);
  const [hourRowHeight] = useState(DEFAULT_HOUR_ROW_HEIGHT);

  const normalizedRangeDays = clampRangeDays(rangeDays);

  const visibleDays = useMemo(
    () =>
      selectedViewMode === "month"
        ? []
        : createVisibleDays(
            currentDate,
            selectedViewMode,
            normalizedRangeDays,
            timelineBuffer,
          ),
    [currentDate, normalizedRangeDays, selectedViewMode, timelineBuffer],
  );

  const demoEvents = useMemo(
    () => (selectedViewMode === "month" ? [] : createDemoEvents(currentDate)),
    [currentDate, selectedViewMode],
  );

  const timelineLanes = useMemo(() => createDemoTimelineLanes(), []);
  const timelineBars = useMemo(() => createDemoTimelineBars(), []);

  const calendarTitleDate =
    selectedViewMode === "month" ? monthTitleDate : currentDate;
  const monthLabel = format(calendarTitleDate, "yyyy年 M月", { locale: ja });
  const viewportDayCount = getViewportDayCount(
    currentDate,
    selectedViewMode,
    normalizedRangeDays,
  );
  const measuredViewportWidth =
    viewportWidth > 0
      ? viewportWidth
      : (contentViewportRef.current?.clientWidth ?? 0);

  const dayColumnWidth =
    activeMode === "timeline"
      ? TIMELINE_DAY_COLUMN_WIDTH
      : measuredViewportWidth > TIME_COLUMN_WIDTH
        ? Math.max(
            1,
            (measuredViewportWidth - TIME_COLUMN_WIDTH) /
              Math.max(1, viewportDayCount),
          )
        : DAY_COLUMN_MIN_WIDTH;

  const gridWidth =
    TIME_COLUMN_WIDTH + visibleDays.length * Math.max(dayColumnWidth, 1);

  const timelineGridStyle: TimelineGridStyle = {
    "--calendar-all-day-row-height": `${allDayRowHeight}px`,
    "--calendar-hour-row-height": `${hourRowHeight}px`,
    gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, ${dayColumnWidth}px)`,
    minWidth: `${gridWidth}px`,
  };

  const requestMonthScrollTarget = useCallback(() => {
    setMonthScrollTargetToken((current) => current + 1);
  }, []);

  const resetTimelinePosition = useCallback(() => {
    shouldSyncScrollRef.current = true;
    setTimelineBuffer(createInitialTimelineBuffer());
  }, []);

  const syncScrollToRangeStart = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || dayColumnWidth <= 0) {
      return;
    }

    scrollContainer.scrollLeft = timelineBuffer.before * dayColumnWidth;
  }, [dayColumnWidth, timelineBuffer.before]);

  const handleSelectViewMode = useCallback(
    (nextViewMode: CalendarViewMode) => {
      setSelectedViewMode(nextViewMode);

      if (nextViewMode === "month") {
        setMonthTitleDate(startOfMonth(currentDate));
        requestMonthScrollTarget();
        return;
      }

      resetTimelinePosition();
    },
    [currentDate, requestMonthScrollTarget, resetTimelinePosition],
  );

  const handleNavigatePrevious = useCallback(() => {
    if (selectedViewMode === "month") {
      const nextDate = subMonths(currentDate, 1);
      setCurrentDate(nextDate);
      setMonthTitleDate(startOfMonth(nextDate));
      requestMonthScrollTarget();
      return;
    }

    const step = selectedViewMode === "week" ? 7 : normalizedRangeDays;
    const nextDate = subDays(currentDate, step);
    setCurrentDate(nextDate);
    resetTimelinePosition();
  }, [
    currentDate,
    normalizedRangeDays,
    requestMonthScrollTarget,
    resetTimelinePosition,
    selectedViewMode,
  ]);

  const handleNavigateNext = useCallback(() => {
    if (selectedViewMode === "month") {
      const nextDate = addMonths(currentDate, 1);
      setCurrentDate(nextDate);
      setMonthTitleDate(startOfMonth(nextDate));
      requestMonthScrollTarget();
      return;
    }

    const step = selectedViewMode === "week" ? 7 : normalizedRangeDays;
    const nextDate = addDays(currentDate, step);
    setCurrentDate(nextDate);
    resetTimelinePosition();
  }, [
    currentDate,
    normalizedRangeDays,
    requestMonthScrollTarget,
    resetTimelinePosition,
    selectedViewMode,
  ]);

  const handleJumpToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setMonthTitleDate(startOfMonth(today));

    if (selectedViewMode === "month") {
      requestMonthScrollTarget();
      return;
    }

    resetTimelinePosition();
  }, [requestMonthScrollTarget, resetTimelinePosition, selectedViewMode]);

  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scrollContainer = event.currentTarget;

      if (selectedViewMode === "month") {
        return;
      }

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
        prependScrollCorrectionRef.current =
          TIMELINE_EXTEND_DAYS * dayColumnWidth;

        setTimelineBuffer((current) => ({
          before: current.before + TIMELINE_EXTEND_DAYS,
          after: current.after,
        }));
      }

      if (
        distanceToRight < TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;

        setTimelineBuffer((current) => ({
          before: current.before,
          after: current.after + TIMELINE_EXTEND_DAYS,
        }));
      }
    },
    [dayColumnWidth, selectedViewMode],
  );

  useLayoutEffect(() => {
    const contentViewport = contentViewportRef.current;

    if (!contentViewport) {
      return undefined;
    }

    const updateViewportWidth = () => {
      const nextWidth = contentViewport.clientWidth;
      setViewportWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    updateViewportWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateViewportWidth();
    });

    resizeObserver.observe(contentViewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (selectedViewMode === "month") {
      return;
    }

    if (!shouldSyncScrollRef.current) {
      return;
    }

    syncScrollToRangeStart();
    shouldSyncScrollRef.current = false;
  }, [selectedViewMode, syncScrollToRangeStart, visibleDays.length]);

  useLayoutEffect(() => {
    if (prependScrollCorrectionRef.current === 0) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      prependScrollCorrectionRef.current = 0;
      isExtendingLeftRef.current = false;
      return;
    }

    scrollContainer.scrollLeft += prependScrollCorrectionRef.current;
    prependScrollCorrectionRef.current = 0;
    isExtendingLeftRef.current = false;
  }, [visibleDays.length]);

  useEffect(() => {
    isExtendingRightRef.current = false;
  }, [timelineBuffer.after]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <CalendarWorkspaceToolbar
        activeMode={activeMode}
        viewMode={selectedViewMode}
        onSelectCalendar={() => setActiveMode("calendar")}
        onSelectTimeline={() => {
          setActiveMode("timeline");
          if (selectedViewMode === "month") {
            setSelectedViewMode("days");
            resetTimelinePosition();
          }
        }}
        onSelectViewMode={handleSelectViewMode}
      />

      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#eceff3] px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#25272d]">
            {monthLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e2e4e9] bg-white text-[#5d6472] transition-colors hover:bg-[#f8f9fb]"
            onClick={handleNavigatePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#e2e4e9] bg-white px-5 text-[15px] font-semibold text-[#25272d] transition-colors hover:bg-[#f8f9fb]"
            onClick={handleJumpToday}
          >
            今日
          </button>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e2e4e9] bg-white text-[#5d6472] transition-colors hover:bg-[#f8f9fb]"
            onClick={handleNavigateNext}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {onClose ? (
            <button
              type="button"
              className="ml-2 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e2e4e9] bg-white text-[#5d6472] transition-colors hover:bg-[#f8f9fb]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div ref={contentViewportRef} className="min-h-0 flex-1 bg-white">
        {activeMode === "timeline" ? (
          <ExplorerCalendarTimelineDayView
            visibleDays={visibleDays}
            selectedDate={currentDate}
            lanes={timelineLanes}
            bars={timelineBars}
            dayColumnWidth={TIMELINE_DAY_COLUMN_WIDTH}
            laneLabelWidth={TIMELINE_LANE_LABEL_WIDTH}
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
              className="min-h-0 flex-1 overflow-auto bg-white"
              onScroll={handleTimelineScroll}
            >
              <div
                ref={timelineGridRef}
                className="grid"
                style={timelineGridStyle}
              >
                <div className="sticky left-0 top-0 z-20 border-b border-r border-[#e5e7eb] bg-white" />
                {visibleDays.map((day) => {
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "sticky top-0 z-10 flex h-8 items-center justify-center border-b border-r border-[#e5e7eb] bg-white text-[12px] font-medium text-[#8f929c] last:border-r-0",
                        isToday && "bg-[#fdf2f2]",
                      )}
                    >
                      {format(day, "d(E)", { locale: ja })}
                    </div>
                  );
                })}

                <div className="sticky left-0 z-10 border-r border-[#e5e7eb] bg-white">
                  <div
                    className="border-b border-[#e5e7eb]"
                    style={{ height: `var(--calendar-all-day-row-height)` }}
                  />
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
                      <div
                        className="border-b border-[#e5e7eb]"
                        style={{ height: `var(--calendar-all-day-row-height)` }}
                      />

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
                          style={calculateEventStyle(event, hourRowHeight)}
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
