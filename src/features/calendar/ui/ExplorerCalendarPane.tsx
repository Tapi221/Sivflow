import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { UIEvent } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { IconProps } from "@/ui/icons";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "@/ui/icons";
import { ExplorerCalendarTimelineDayView } from "./ExplorerCalendarTimelineDayView";

type ExplorerCalendarPaneProps = {
  onClose?: () => void;
};

export type CalendarViewMode = "month" | "week" | "days";
export type CalendarToolbarMode = "calendar" | "timeline";

type TimelineBufferDays = {
  before: number;
  after: number;
};

const WEEK_STARTS_ON_MONDAY = 1;
const INITIAL_TIMELINE_BUFFER_DAYS = 7;
const TIMELINE_EXTEND_DAYS = 14;
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

type CalendarWorkspaceToolbarProps = {
  activeMode: CalendarToolbarMode;
  viewMode: CalendarViewMode;
  onSelectCalendar: () => void;
  onSelectTimeline: () => void;
  onSelectViewMode: (viewMode: CalendarViewMode) => void;
};

const CALENDAR_TOOLBAR_ACTIONS = [
  { label: "Search", icon: Search },
  { label: "Filter", icon: Filter },
] as const;

const CALENDAR_VIEW_MODE_TOOLBAR_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "days", label: "Day" },
] as const satisfies Array<{ value: CalendarViewMode; label: string }>;

const CalendarWorkspaceToolbar = ({
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
      </div>

      <div className="flex h-7 shrink-0 items-center justify-end gap-[6px]">
        {CALENDAR_TOOLBAR_ACTIONS.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              className="flex h-7 items-center gap-[6px] rounded py-[3px] pl-2 pr-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal text-[#8f929c] transition-colors hover:bg-[#f6f7f9] hover:text-[#25272d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

const getRangeDayCount = (baseDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") {
    return getDaysInMonth(baseDate);
  }

  return viewMode === "week" ? 7 : 1;
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prependScrollCorrectionRef = useRef(0);
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);
  const shouldSyncScrollRef = useRef(true);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewMode>("days");
  const [activeMode, setActiveMode] =
    useState<CalendarToolbarMode>("timeline");
  const [timelineBuffer, setTimelineBuffer] = useState(
    createInitialTimelineBuffer,
  );

  const visibleDays = useMemo(
    () => createVisibleDays(currentDate, selectedViewMode, timelineBuffer),
    [currentDate, selectedViewMode, timelineBuffer],
  );

  const titleDate =
    selectedViewMode === "month" ? startOfMonth(currentDate) : currentDate;
  const monthLabel = format(titleDate, "yyyy年 M月", { locale: ja });

  const resetTimelinePosition = useCallback(() => {
    shouldSyncScrollRef.current = true;
    setTimelineBuffer(createInitialTimelineBuffer());
  }, []);

  const handleTimelineScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
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
      prependScrollCorrectionRef.current =
        TIMELINE_EXTEND_DAYS * TIMELINE_DAY_COLUMN_WIDTH;

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
      timelineBuffer.before * TIMELINE_DAY_COLUMN_WIDTH;
    shouldSyncScrollRef.current = false;
  }, [timelineBuffer.before, visibleDays.length]);

  useLayoutEffect(() => {
    isExtendingRightRef.current = false;
  }, [timelineBuffer.after]);

  const handleSelectViewMode = (nextViewMode: CalendarViewMode) => {
    setSelectedViewMode(nextViewMode);
    resetTimelinePosition();
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    resetTimelinePosition();
  };

  const handlePrevious = () => {
    setCurrentDate((current) => getPreviousDate(current, selectedViewMode));
    resetTimelinePosition();
  };

  const handleNext = () => {
    setCurrentDate((current) => getNextDate(current, selectedViewMode));
    resetTimelinePosition();
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

      <div className="flex min-h-0 flex-1 flex-col bg-white px-5 pb-5 pt-4">
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
            visibleDays={visibleDays}
            selectedDate={currentDate}
            dayColumnWidth={TIMELINE_DAY_COLUMN_WIDTH}
            laneLabelWidth={TIMELINE_LANE_LABEL_WIDTH}
            rowCount={TIMELINE_SKELETON_ROW_COUNT}
            scrollContainerRef={scrollContainerRef}
            onScroll={handleTimelineScroll}
            onSelectDate={setCurrentDate}
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#d9dee7] bg-[#fbfcfd] text-[14px] text-[#8a94a6]">
            Calendar view placeholder
          </div>
        )}
      </div>
    </div>
  );
};
