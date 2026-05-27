import type { RefObject, UIEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { useCalendarEventSync } from "@/sync/googlecalendar-sync/useCalendarEventSync";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import type { CalendarToolbarMode, CalendarViewMode, GoogleAccountDisplay, TimelineGridStyle } from "./scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { buildTimelineColumns, TimelineUnitBuffer } from "@/features/calendar/grid/TimelineDayView.shared";
import { useCalendarLayout } from "@/features/calendar/layout/calendar/useCalendarLayout.desktop";
import { useCalendarNavigation } from "./useCalendarNavigation";
import { useCalendarScrollController } from "@/features/scroll/schedule/hooks/useCalendarScrollController";
import { useCalendarVisibleRange } from "./useCalendarVisibleRange";
import { useGoogleCalendarLayer } from "./useGoogleCalendarLayer";
import { useTimelineGrid } from "@/features/calendar/grid/useTimelineGrid";

export type UseScheduleScreenReturn = {
  contentViewportRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef: RefObject<HTMLDivElement | null>;
  handleCalendarScroll: (event: UIEvent<HTMLDivElement>) => void;

  currentDate: Date;
  selectedDate: Date;
  timelineTitleDate: Date;
  monthTitleDate: Date;
  monthScrollTargetToken: number;
  timelineUnitBuffer: TimelineUnitBuffer;

  selectedViewMode: CalendarViewMode;
  activeMode: CalendarToolbarMode;
  setActiveMode: (mode: CalendarToolbarMode) => void;

  visibleDays: Date[];
  displayDays: Date[];

  timelineColumns: ReturnType<typeof buildTimelineColumns>;
  timelineColumnWidth: number;
  timelineAnchorColumnIndex: number;

  titleDate: Date;
  monthLabel: string | null;

  calendarDayColumnWidth: number;
  timelineGridStyle: TimelineGridStyle;

  googleAccounts: GoogleAccountDisplay[];
  googleCalendarEvents: GoogleCalendarEvent[];
  isAnyCalendarConnecting: boolean;

  addGoogleCalendar: () => Promise<void>;
  reconnectGoogleAccount: (accountId: string) => Promise<void>;
  toggleGoogleCalendar: (accountId: string, calendarId: string) => void;

  refreshGoogleTasks: () => Promise<void>;
  retryGoogleTaskLists: () => void;
  createGoogleTask: (taskListId: string, input: {
    title: string;
    notes?: string | null;
    due?: string | null;
    status?: "needsAction" | "completed";
  }) => Promise<unknown>;
  updateGoogleTask: (taskListId: string, taskId: string, patch: {
    title?: string;
    notes?: string | null;
    due?: string | null;
    status?: "needsAction" | "completed";
    completed?: string | null;
  }) => Promise<unknown>;
  moveGoogleTaskList: (taskListId: string, taskId: string, destinationTaskListId: string) => Promise<unknown>;
  deleteGoogleTask: (taskListId: string, taskId: string) => Promise<void>;

  handleSelectViewMode: (viewMode: CalendarViewMode) => void;
  handleToday: () => void;
  handlePrevious: () => void;
  handleNext: () => void;

  handleSidebarPreviousMonth: () => void;
  handleSidebarNextMonth: () => void;
  handleSidebarSelectDate: (date: Date) => void;
  handleTimelineSelectDate: (date: Date) => void;
  handleVisibleMonthChange: (date: Date) => void;
  handleMonthCellSelectDate: (date: Date) => void;
  handleMonthRenderedRangeChange: (range: CalendarDateRange) => void;

  setMonthTitleDate: (date: Date) => void;
};

type UseScheduleScreenOptions = {
  initialActiveMode?: CalendarToolbarMode;
};

const getEventTime = (value: GoogleCalendarEvent["startsAt"]): number => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : Number.NaN;
};

const getGoogleCalendarEventDedupeKey = (event: GoogleCalendarEvent): string => {
  return [
    event.calendarId,
    event.title.trim(),
    getEventTime(event.startsAt),
    getEventTime(event.endsAt),
    event.isAllDay ? "all-day" : "timed",
  ].join("\u001f");
};

const dedupeGoogleCalendarEvents = (
  events: GoogleCalendarEvent[],
): GoogleCalendarEvent[] => {
  const seenKeys = new Set<string>();

  return events.filter((event) => {
    const key = getGoogleCalendarEventDedupeKey(event);

    if (seenKeys.has(key)) return false;

    seenKeys.add(key);
    return true;
  });
};

export const useScheduleScreen = ({
  initialActiveMode,
}: UseScheduleScreenOptions = {}): UseScheduleScreenReturn => {
  const navigation = useCalendarNavigation({ initialActiveMode });
  const [monthRenderedRange, setMonthRenderedRange] =
    useState<CalendarDateRange | null>(null);

  const handleMonthRenderedRangeChange = useCallback(
    (range: CalendarDateRange) => {
      setMonthRenderedRange((prev) => {
        if (
          prev?.start.getTime() === range.start.getTime() &&
          prev.end.getTime() === range.end.getTime()
        ) {
          return prev;
        }

        return range;
      });
    },
    [],
  );

  const visibleRange = useCalendarVisibleRange({
    currentDate: navigation.currentDate,
    selectedViewMode: navigation.selectedViewMode,
    calendarBuffer: navigation.calendarBuffer,
  });

  const visibleDays = visibleRange.interactionDays;
  const displayDays = visibleRange.displayDays;

  const layout = useCalendarLayout({
    viewportWidth: navigation.viewportWidth,
    visibleDays,
    displayDays,
    selectedViewMode: navigation.selectedViewMode,
    currentDate: navigation.currentDate,
    calendarBuffer: navigation.calendarBuffer,
  });

  const timeline = useTimelineGrid({
    currentDate: navigation.currentDate,
    selectedViewMode: navigation.selectedViewMode,
    timelineUnitBuffer: navigation.timelineUnitBuffer,
  });

  const extendScrollLeft =
    navigation.activeMode === "timeline"
      ? navigation.extendTimelineUnitBufferLeft
      : navigation.extendCalendarBufferLeft;
  const extendScrollRight =
    navigation.activeMode === "timeline"
      ? navigation.extendTimelineUnitBufferRight
      : navigation.extendCalendarBufferRight;

  const scroll = useCalendarScrollController({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays,
    timelineColumns: timeline.timelineColumns,
    timelineColumnWidth: timeline.timelineColumnWidth,
    timelineAnchorColumnIndex: timeline.timelineAnchorColumnIndex,
    timelineUnitBuffer: navigation.timelineUnitBuffer,
    calendarBuffer: navigation.calendarBuffer,
    viewportWidth: navigation.viewportWidth,
    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    onExtendLeft: extendScrollLeft,
    onExtendRight: extendScrollRight,
    onTimelineVisibleDateChange: navigation.handleTimelineVisibleDateChange,
    scrollTargetToken: navigation.calendarScrollToken,
  });

  const google = useGoogleCalendarLayer();
  const googleCalendarEvents = useMemo(
    () => dedupeGoogleCalendarEvents(google.events),
    [google.events],
  );

  useCalendarEventSync({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays,
    monthTitleDate: navigation.monthTitleDate,
    monthRenderedRange,
    timelineColumns: timeline.timelineColumns,
    googleCalendar: {
      selectedCalendarIds: google.selectedCalendarIds,
      forceSyncRange: google.forceSyncRange,
    },
  });

  const googleAccounts: GoogleAccountDisplay[] = google.googleAccounts.map(
    (account) => {
      const taskListState = google.taskListsByAccount[account.id];
      const googleTasksState = google.googleTasksByAccount[account.id];

      return {
        accountId: account.id,
        email: account.email,
        name: account.name,
        photoUrl: account.photoUrl,
        calendars: account.calendars,
        taskLists: taskListState?.taskLists ?? [],
        taskListsError: taskListState?.error ?? null,
        isTaskListsLoading: taskListState?.isLoading ?? false,
        googleTasks: googleTasksState?.tasks ?? [],
        googleTasksError: googleTasksState?.error ?? null,
        isGoogleTasksLoading: googleTasksState?.isLoading ?? false,
        selectedCalendarIds: account.selectedCalendarIds,
        connectionStatus: account.connectionStatus,
        error: account.error,
      };
    },
  );

  return {
    contentViewportRef: navigation.contentViewportRef,
    scrollContainerRef: scroll.scrollContainerRef,
    headerScrollRef: scroll.headerScrollRef,
    allDayScrollRef: scroll.allDayScrollRef,
    handleCalendarScroll: scroll.handleScroll,

    currentDate: navigation.currentDate,
    selectedDate: navigation.selectedDate,
    timelineTitleDate: navigation.timelineTitleDate,
    monthTitleDate: navigation.monthTitleDate,
    monthScrollTargetToken: navigation.monthScrollTargetToken,
    timelineUnitBuffer: navigation.timelineUnitBuffer,

    selectedViewMode: navigation.selectedViewMode,
    activeMode: navigation.activeMode,
    setActiveMode: navigation.setActiveMode,

    visibleDays,
    displayDays,

    timelineColumns: timeline.timelineColumns,
    timelineColumnWidth: timeline.timelineColumnWidth,
    timelineAnchorColumnIndex: timeline.timelineAnchorColumnIndex,

    titleDate:
      navigation.activeMode === "timeline"
        ? navigation.timelineTitleDate
        : layout.titleDate,
    monthLabel: layout.monthLabel,

    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    timelineGridStyle: layout.timelineGridStyle,

    googleAccounts,
    googleCalendarEvents,
    isAnyCalendarConnecting: google.isAnyConnecting,

    addGoogleCalendar: google.addAccount,
    reconnectGoogleAccount: google.reconnectAccount,
    toggleGoogleCalendar: google.toggleCalendar,
    refreshGoogleTasks: google.refreshGoogleTasks,
    retryGoogleTaskLists: google.retryGoogleTaskLists,
    createGoogleTask: google.createGoogleTask,
    updateGoogleTask: google.updateGoogleTask,
    moveGoogleTaskList: google.moveGoogleTaskList,
    deleteGoogleTask: google.deleteGoogleTask,

    handleSelectViewMode: navigation.handleSelectViewMode,
    handleToday: navigation.handleToday,
    handlePrevious: navigation.handlePrevious,
    handleNext: navigation.handleNext,

    handleSidebarPreviousMonth: navigation.handleSidebarPreviousMonth,
    handleSidebarNextMonth: navigation.handleSidebarNextMonth,
    handleSidebarSelectDate: navigation.handleSidebarSelectDate,
    handleTimelineSelectDate: navigation.handleTimelineSelectDate,
    handleVisibleMonthChange: navigation.handleVisibleMonthChange,
    handleMonthCellSelectDate: navigation.handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,

    setMonthTitleDate: navigation.setMonthTitleDate,
  };
};